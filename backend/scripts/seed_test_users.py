import argparse
import os
import sys

from sqlalchemy import text

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal
from app.models import Batch, Faculty, Institute, InstituteAdmin, Student, SuperAdmin
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


def ensure_partitions(db, institute_id, institute_code: str, partition_schema: str) -> None:
    institute_id_str = str(institute_id)
    suffix = institute_code.lower()
    db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {partition_schema}"))
    for parent in PARTITIONED_PARENT_TABLES:
        partition_name = f"{parent}_{suffix}"
        sql = f"""
        CREATE TABLE IF NOT EXISTS {partition_schema}.{partition_name}
        PARTITION OF public.{parent}
        FOR VALUES IN ('{institute_id_str}')
        """
        db.execute(text(sql))


def seed_test_credentials(institute_name: str, institute_code: str, password: str, partition_schema: str) -> int:
    db = SessionLocal()
    try:
        password_hash = get_password_hash(password)

        institute = db.query(Institute).filter(Institute.name == institute_name).first()
        if not institute:
            institute = Institute(institute_code=institute_code.upper(), name=institute_name)
            db.add(institute)
            db.commit()
            db.refresh(institute)
            print(f"Created institute: {institute_name} ({institute_code.upper()})")
        else:
            print(f"Institute already exists: {institute.name} ({institute.institute_code})")

        ensure_partitions(db, institute.id, institute.institute_code, partition_schema)
        db.commit()

        super_admin_email = "superadmin@pheme.testing"
        super_admin = db.query(SuperAdmin).filter(SuperAdmin.email == super_admin_email).first()
        if not super_admin:
            db.add(SuperAdmin(email=super_admin_email, password_hash=password_hash))
            print(f"Created super admin: {super_admin_email}")
        else:
            print(f"Super admin already exists: {super_admin_email}")

        inst_admin_email = "instituteadmin@pheme.testing"
        inst_admin = db.query(InstituteAdmin).filter(InstituteAdmin.email == inst_admin_email).first()
        if not inst_admin:
            db.add(
                InstituteAdmin(
                    institute_id=institute.id,
                    emp_id="ADM01",
                    name="Pheme Institute Admin",
                    email=inst_admin_email,
                    password_hash=password_hash,
                )
            )
            print(f"Created institute admin: {inst_admin_email}")
        else:
            print(f"Institute admin already exists: {inst_admin_email}")

        exam_admin_email = "examadmin@pheme.testing"
        exam_admin = db.query(Faculty).filter(Faculty.email == exam_admin_email).first()
        if not exam_admin:
            db.add(
                Faculty(
                    institute_id=institute.id,
                    dept_code="CS",
                    emp_id="EX01",
                    name="Pheme Exam Admin",
                    email=exam_admin_email,
                    password_hash=password_hash,
                )
            )
            print(f"Created exam admin: {exam_admin_email}")
        else:
            print(f"Exam admin already exists: {exam_admin_email}")

        proctor_email = "proctor@pheme.testing"
        proctor = db.query(Faculty).filter(Faculty.email == proctor_email).first()
        if not proctor:
            db.add(
                Faculty(
                    institute_id=institute.id,
                    dept_code="CS",
                    emp_id="PR01",
                    name="Pheme Proctor",
                    email=proctor_email,
                    password_hash=password_hash,
                )
            )
            print(f"Created proctor: {proctor_email}")
        else:
            print(f"Proctor already exists: {proctor_email}")

        batch = (
            db.query(Batch)
            .filter(Batch.institute_id == institute.id)
            .filter(Batch.course_code == "BTECH")
            .filter(Batch.batch_year == "26")
            .first()
        )
        if not batch:
            batch = Batch(
                institute_id=institute.id,
                course_code="BTECH",
                batch_year="26",
                course_name="B.Tech CSE",
            )
            db.add(batch)
            db.flush()
            print("Created batch: BTECH-26")
        else:
            print("Batch already exists: BTECH-26")

        student_email = "student1@pheme.testing"
        student = db.query(Student).filter(Student.email == student_email).first()
        if not student:
            db.add(
                Student(
                    institute_id=institute.id,
                    batch_id=batch.id,
                    section="A",
                    roll_no="001",
                    name="Pheme Test Student",
                    email=student_email,
                    password_hash=password_hash,
                )
            )
            print(f"Created student: {student_email}")
        else:
            print(f"Student already exists: {student_email}")

        db.commit()

        print("\nSeed complete.")
        print("Common password for all seeded users:", password)
        print("super_admin:", super_admin_email)
        print("institute_admin:", inst_admin_email)
        print("exam_admin:", exam_admin_email)
        print("proctor:", proctor_email)
        print("student:", student_email)
        return 0
    finally:
        db.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed institute + test credentials for the new partitioned schema.")
    parser.add_argument("--institute", default="Pheme Testing")
    parser.add_argument("--institute-code", default="PHEME")
    parser.add_argument("--password", default="Testing123!")
    parser.add_argument("--partition-schema", default="tenant_partitions")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exit_code = seed_test_credentials(args.institute, args.institute_code, args.password, args.partition_schema)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
