import argparse
import csv
import os
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models import (
    Batch,
    Exam,
    ExamAssignment,
    ExamSession,
    Faculty,
    Institute,
    InstituteAdmin,
    Question,
    Student,
    SuperAdmin,
)
from app.security import get_password_hash

PARTITIONED_PARENT_TABLES = [
    "institute_admins",
    "batches",
    "faculties",
    "students",
    "exams",
    "ques_ans",
    "exam_assignments",
    "exam_sessions",
]


@dataclass
class InstituteSeed:
    institute_code: str
    name: str
    address: str
    contact_email: str


@dataclass
class CredentialRow:
    institute_code: str
    account_type: str
    name: str
    email: str
    emp_id: str
    password: str


INSTITUTES = [
    InstituteSeed("NOVA01", "Nova Institute of Technology", "North Campus, City A", "contact@nova01.edu"),
    InstituteSeed("PINE02", "Pine Valley University", "West Campus, City B", "contact@pine02.edu"),
    InstituteSeed("AURM03", "Aurum School of Business & Engineering", "Central Campus, City C", "contact@aurm03.edu"),
    InstituteSeed("SUSP04", "Demo Suspended Institute (Simulation)", "Demo Campus, City D", "contact@susp04.edu"),
    InstituteSeed("RIVR05", "Riverdale College", "East Campus, City E", "contact@rivr05.edu"),
]

STUDENT_NAMES = [
    ("Aarav Sharma", "A", "001"),
    ("Priya Nair", "A", "002"),
    ("Rohan Verma", "B", "003"),
    ("Ananya Iyer", "C", "004"),
    ("Vikram Singh", "A", "005"),
]

FACULTY_DEPTS = [
    ("CS", "CS01", "Faculty CS", "fac.cs"),
    ("EE", "EE02", "Faculty EE", "fac.ee"),
    ("MBA", "MBA03", "Faculty MBA", "fac.mba"),
]


def ensure_schema_patch(db, schema_name: str) -> None:
    db.execute(text("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\""))
    db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
    db.execute(text("ALTER TABLE IF EXISTS public.exams ADD COLUMN IF NOT EXISTS end_time TIMESTAMP WITH TIME ZONE"))
    db.execute(
        text(
            """
            ALTER TABLE IF EXISTS public.exam_sessions
            ADD COLUMN IF NOT EXISTS violation_logs_id VARCHAR,
            ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP
            """
        )
    )


def cleanup_seed_scope(db) -> None:
    codes = ", ".join(f"'{item.institute_code}'" for item in INSTITUTES)
    db.execute(text("DELETE FROM public.super_admins WHERE email = 'superadmin@aiproctor.dev'"))
    db.execute(text(f"DELETE FROM public.institutes WHERE institute_code IN ({codes})"))

    for schema in ("public", "tenant_partition", "tenant_partitions"):
        for institute in (item.institute_code.lower() for item in INSTITUTES):
            for base in (
                "exam_sessions",
                "exam_assignments",
                "ques_ans",
                "students",
                "exams",
                "faculties",
                "batches",
                "institute_admins",
            ):
                db.execute(text(f"DROP TABLE IF EXISTS {schema}.{base}_{institute} CASCADE"))


def ensure_partitions(db, institute_id: Any, institute_code: str, partition_schema: str) -> None:
    institute_id_str = str(institute_id)
    suffix = institute_code.lower()
    for parent in PARTITIONED_PARENT_TABLES:
        partition_name = f"{parent}_{suffix}"
        db.execute(
            text(
                f"""
                CREATE TABLE IF NOT EXISTS {partition_schema}.{partition_name}
                PARTITION OF public.{parent}
                FOR VALUES IN ('{institute_id_str}')
                """
            )
        )


def slugify_name(name: str) -> str:
    return ".".join(name.lower().split())


def write_credentials_csv(path: Path, rows: list[CredentialRow]) -> None:
    headers = ["institute_code", "account_type", "name", "email", "emp_id", "password"]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        for row in rows:
            writer.writerow([row.institute_code, row.account_type, row.name, row.email, row.emp_id, row.password])


def _xml_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def write_credentials_xlsx(path: Path, rows: list[CredentialRow]) -> None:
    headers = ["institute_code", "account_type", "name", "email", "emp_id", "password"]
    data = [[r.institute_code, r.account_type, r.name, r.email, r.emp_id, r.password] for r in rows]

    def cell_ref(col_index: int, row_index: int) -> str:
        col = ""
        n = col_index
        while n >= 0:
            col = chr((n % 26) + 65) + col
            n = (n // 26) - 1
        return f"{col}{row_index}"

    sheet_rows = []
    all_rows = [headers] + data
    for row_idx, row in enumerate(all_rows, start=1):
        cells = []
        for col_idx, value in enumerate(row):
            ref = cell_ref(col_idx, row_idx)
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{_xml_escape(str(value))}</t></is></c>')
        sheet_rows.append(f"<row r=\"{row_idx}\">{''.join(cells)}</row>")

    sheet_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
        f"<sheetData>{''.join(sheet_rows)}</sheetData>"
        "</worksheet>"
    )

    workbook_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" "
        "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
        "<sheets><sheet name=\"credentials\" sheetId=\"1\" r:id=\"rId1\"/></sheets>"
        "</workbook>"
    )

    content_types = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
        "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
        "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
        "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>"
        "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>"
        "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>"
        "</Types>"
    )

    root_rels = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>"
        "</Relationships>"
    )

    workbook_rels = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>"
        "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>"
        "</Relationships>"
    )

    styles_xml = (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
        "<fonts count=\"1\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>"
        "<fills count=\"1\"><fill><patternFill patternType=\"none\"/></fill></fills>"
        "<borders count=\"1\"><border/></borders>"
        "<cellStyleXfs count=\"1\"><xf/></cellStyleXfs>"
        "<cellXfs count=\"1\"><xf xfId=\"0\"/></cellXfs>"
        "</styleSheet>"
    )

    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", root_rels)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        zf.writestr("xl/styles.xml", styles_xml)


def seed_all(partition_schema: str, output_dir: Path, common_password: str) -> int:
    credentials: list[CredentialRow] = []
    db = SessionLocal()
    try:
        ensure_schema_patch(db, partition_schema)
        cleanup_seed_scope(db)

        super_admin = SuperAdmin(
            email="superadmin@aiproctor.dev",
            password_hash=get_password_hash(common_password),
            created_at=datetime.now(timezone.utc),
        )
        db.add(super_admin)
        credentials.append(
            CredentialRow(
                institute_code="GLOBAL",
                account_type="super_admin",
                name="Platform Super Admin",
                email=super_admin.email,
                emp_id="",
                password=common_password,
            )
        )
        db.flush()

        now = datetime.now(timezone.utc)

        for index, institute_seed in enumerate(INSTITUTES, start=1):
            institute = Institute(
                institute_code=institute_seed.institute_code,
                name=institute_seed.name,
                address=institute_seed.address,
                contact_email=institute_seed.contact_email,
                created_at=now - timedelta(days=(130 - index * 10)),
            )
            db.add(institute)
            db.flush()

            ensure_partitions(db, institute.id, institute.institute_code, partition_schema)

            institute_admin = InstituteAdmin(
                institute_id=institute.id,
                emp_id="01",
                name=f"{institute.institute_code} Institute Admin",
                email=f"{institute.institute_code.lower()}.admin@seed.edu",
                password_hash=get_password_hash(common_password),
                created_at=now - timedelta(days=30),
            )
            db.add(institute_admin)
            db.flush()
            credentials.append(
                CredentialRow(
                    institute_code=institute.institute_code,
                    account_type="institute_admin",
                    name=institute_admin.name,
                    email=institute_admin.email,
                    emp_id=institute_admin.emp_id,
                    password=common_password,
                )
            )

            btech_batch = Batch(
                institute_id=institute.id,
                course_code="BTECH",
                batch_year="23",
                course_name="Bachelor of Technology",
                created_at=now - timedelta(days=25),
            )
            mba_batch = Batch(
                institute_id=institute.id,
                course_code="MBA",
                batch_year="24",
                course_name="Master of Business Administration",
                created_at=now - timedelta(days=24),
            )
            db.add_all([btech_batch, mba_batch])
            db.flush()

            faculties: list[Faculty] = []
            for dept_code, emp_id, label, email_prefix in FACULTY_DEPTS:
                faculty = Faculty(
                    institute_id=institute.id,
                    dept_code=dept_code,
                    emp_id=emp_id,
                    name=f"{institute.institute_code} {label}",
                    email=f"{institute.institute_code.lower()}.{email_prefix}@seed.edu",
                    password_hash=get_password_hash(common_password),
                    created_at=now - timedelta(days=20),
                )
                faculties.append(faculty)
                db.add(faculty)
            db.flush()

            for faculty in faculties:
                credentials.append(
                    CredentialRow(
                        institute_code=institute.institute_code,
                        account_type="faculty",
                        name=faculty.name,
                        email=faculty.email,
                        emp_id=faculty.emp_id,
                        password=common_password,
                    )
                )

            students: list[Student] = []
            for i, (student_name, section, roll_no) in enumerate(STUDENT_NAMES):
                batch_id = btech_batch.id if i < 3 else mba_batch.id
                student = Student(
                    institute_id=institute.id,
                    batch_id=batch_id,
                    section=section,
                    roll_no=roll_no,
                    name=student_name,
                    email=f"{institute.institute_code.lower()}.{slugify_name(student_name)}@seed.edu",
                    password_hash=get_password_hash(common_password),
                    created_at=now - timedelta(days=(15 - i)),
                )
                students.append(student)
                db.add(student)
            db.flush()

            for student in students:
                credentials.append(
                    CredentialRow(
                        institute_code=institute.institute_code,
                        account_type="student",
                        name=student.name,
                        email=student.email,
                        emp_id="",
                        password=common_password,
                    )
                )

            exam_upcoming = Exam(
                institute_id=institute.id,
                faculty_id=faculties[0].id,
                subject_code="CSMID",
                exam_type="MID",
                exam_year="26",
                title=f"{institute.institute_code} Midterm Upcoming",
                duration_minutes=90,
                passing_marks=40,
                scheduled_time=now + timedelta(days=7),
                end_time=now + timedelta(days=7, hours=1, minutes=30),
                created_at=now,
            )
            exam_live = Exam(
                institute_id=institute.id,
                faculty_id=faculties[1].id,
                subject_code="EEMID",
                exam_type="MID",
                exam_year="26",
                title=f"{institute.institute_code} Midterm Live",
                duration_minutes=75,
                passing_marks=35,
                scheduled_time=now,
                end_time=now + timedelta(hours=1, minutes=15),
                created_at=now,
            )
            exam_completed = Exam(
                institute_id=institute.id,
                faculty_id=faculties[2].id,
                subject_code="MBAMID",
                exam_type="MID",
                exam_year="26",
                title=f"{institute.institute_code} Midterm Completed",
                duration_minutes=120,
                passing_marks=50,
                scheduled_time=now - timedelta(days=7),
                end_time=(now - timedelta(days=7)) + timedelta(hours=2),
                created_at=now - timedelta(days=8),
            )
            db.add_all([exam_upcoming, exam_live, exam_completed])
            db.flush()

            for exam_obj, label in ((exam_upcoming, "Upcoming"), (exam_live, "Live"), (exam_completed, "Completed")):
                for qn in range(1, 11):
                    db.add(
                        Question(
                            institute_id=institute.id,
                            exam_id=exam_obj.id,
                            question_text=f"{label} Q{qn} - {institute.institute_code}",
                            options={"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"},
                            correct_answer=("A", "B", "C", "D")[(qn - 1) % 4],
                            marks=1 if qn <= 5 else 2,
                        )
                    )

            db.add_all(
                [
                    ExamAssignment(institute_id=institute.id, exam_id=exam_upcoming.id, batch_id=btech_batch.id, assigned_at=now - timedelta(days=1)),
                    ExamAssignment(institute_id=institute.id, exam_id=exam_live.id, batch_id=mba_batch.id, assigned_at=now - timedelta(hours=2)),
                    ExamAssignment(institute_id=institute.id, exam_id=exam_completed.id, batch_id=btech_batch.id, assigned_at=now - timedelta(days=9)),
                ]
            )

            db.add_all(
                [
                    ExamSession(
                        institute_id=institute.id,
                        exam_id=exam_completed.id,
                        student_id=students[0].id,
                        session_status="completed",
                        started_at=(now - timedelta(days=7)) + timedelta(minutes=10),
                        completed_at=(now - timedelta(days=7)) + timedelta(hours=1, minutes=40),
                        final_score=92,
                        violation_found=False,
                        mongo_log_ref=None,
                        s3_media_prefix=f"s3://aiproctor/{institute.institute_code.lower()}/completed/{students[0].id}",
                    ),
                    ExamSession(
                        institute_id=institute.id,
                        exam_id=exam_completed.id,
                        student_id=students[1].id,
                        session_status="completed",
                        started_at=(now - timedelta(days=7)) + timedelta(minutes=12),
                        completed_at=(now - timedelta(days=7)) + timedelta(hours=1, minutes=43),
                        final_score=65,
                        violation_found=False,
                        mongo_log_ref=None,
                        s3_media_prefix=f"s3://aiproctor/{institute.institute_code.lower()}/completed/{students[1].id}",
                    ),
                    ExamSession(
                        institute_id=institute.id,
                        exam_id=exam_completed.id,
                        student_id=students[2].id,
                        session_status="completed",
                        started_at=(now - timedelta(days=7)) + timedelta(minutes=14),
                        completed_at=(now - timedelta(days=7)) + timedelta(hours=1, minutes=50),
                        final_score=40,
                        violation_found=True,
                        mongo_log_ref=f"mongo://violations/{institute.institute_code.lower()}/{students[2].id}",
                        s3_media_prefix=f"s3://aiproctor/{institute.institute_code.lower()}/completed/{students[2].id}",
                    ),
                    ExamSession(
                        institute_id=institute.id,
                        exam_id=exam_live.id,
                        student_id=students[3].id,
                        session_status="in_progress",
                        started_at=now - timedelta(minutes=20),
                        completed_at=None,
                        final_score=None,
                        violation_found=False,
                        mongo_log_ref=None,
                        s3_media_prefix=f"s3://aiproctor/{institute.institute_code.lower()}/live/{students[3].id}",
                    ),
                    ExamSession(
                        institute_id=institute.id,
                        exam_id=exam_upcoming.id,
                        student_id=students[4].id,
                        session_status="not_started",
                        started_at=None,
                        completed_at=None,
                        final_score=None,
                        violation_found=False,
                        mongo_log_ref=None,
                        s3_media_prefix=f"s3://aiproctor/{institute.institute_code.lower()}/upcoming/{students[4].id}",
                    ),
                ]
            )

        db.commit()

        output_dir.mkdir(parents=True, exist_ok=True)
        csv_path = output_dir / "seed_credentials.csv"
        xlsx_path = output_dir / "seed_credentials.xlsx"
        write_credentials_csv(csv_path, credentials)
        write_credentials_xlsx(xlsx_path, credentials)

        print("Seed completed successfully.")
        print(f"Credentials CSV: {csv_path}")
        print(f"Credentials XLSX: {xlsx_path}")
        print(f"Total credential rows: {len(credentials)}")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed full multitenant demo data and export account credentials.")
    parser.add_argument("--partition-schema", default="tenant_partitions")
    parser.add_argument("--password", default="Testing123!")
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parent),
        help="Directory where seed_credentials.csv and seed_credentials.xlsx will be written.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exit_code = seed_all(args.partition_schema, Path(args.output_dir), args.password)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
