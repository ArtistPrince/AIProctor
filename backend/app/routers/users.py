import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role, verify_password

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])
require_institute_admin = require_role(["institute_admin"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.get("/users/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(database.get_db),
    current_user = Depends(require_admin),
):
    users: list[schemas.UserOut] = []

    if current_user.role == "super_admin":
        for user in db.query(models.SuperAdmin).all():
            users.append(schemas.UserOut(id=str(user.id), email=user.email, role="super_admin", name="Super Admin"))

        for user in db.query(models.InstituteAdmin).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    email=user.email,
                    role="institute_admin",
                    name=user.name,
                    code=user.admin_code,
                )
            )

        for user in db.query(models.Faculty).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    email=user.email,
                    role="exam_admin",
                    name=user.name,
                    code=user.faculty_code,
                )
            )

        for user in db.query(models.Student).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    batch_id=str(user.batch_id),
                    email=user.email,
                    role="student",
                    name=user.name,
                    code=user.student_code,
                    roll_no=user.roll_no,
                    section=user.section,
                )
            )
        return users

    if current_user.institute_id is None:
        return []

    institute_id = current_user.institute_id
    for user in db.query(models.InstituteAdmin).filter(models.InstituteAdmin.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                email=user.email,
                role="institute_admin",
                name=user.name,
                code=user.admin_code,
            )
        )
    for user in db.query(models.Faculty).filter(models.Faculty.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                email=user.email,
                role="exam_admin",
                name=user.name,
                code=user.faculty_code,
            )
        )
    for user in db.query(models.Student).filter(models.Student.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                batch_id=str(user.batch_id),
                email=user.email,
                role="student",
                name=user.name,
                code=user.student_code,
                roll_no=user.roll_no,
                section=user.section,
            )
        )
    return users


@router.put("/students/{student_id}", response_model=schemas.UserOut)
def update_student(
    student_id: str,
    payload: schemas.StudentUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if current_user.role != "super_admin" and str(student.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot update student outside your institute")

    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"] is not None and data["email"] != student.email:
        existing = (
            db.query(models.Student)
            .filter(models.Student.institute_id == student.institute_id)
            .filter(models.Student.email == data["email"])
            .filter(models.Student.id != student.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Student with this email already exists")
        student.email = data["email"]

    if "name" in data and data["name"] is not None:
        student.name = data["name"]

    if "batch_id" in data and data["batch_id"] is not None and str(data["batch_id"]) != str(student.batch_id):
        batch = db.query(models.Batch).filter(models.Batch.id == data["batch_id"]).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if str(batch.institute_id) != str(student.institute_id):
            raise HTTPException(status_code=400, detail="Batch does not belong to institute")
        student.batch_id = data["batch_id"]

    if "section" in data and data["section"] is not None:
        student.section = data["section"]
    if "roll_no" in data and data["roll_no"] is not None:
        student.roll_no = data["roll_no"]

    db.commit()
    db.refresh(student)

    return schemas.UserOut(
        id=str(student.id),
        institute_id=str(student.institute_id),
        batch_id=str(student.batch_id),
        email=student.email,
        role="student",
        name=student.name,
        code=student.student_code,
        roll_no=student.roll_no,
        section=student.section,
    )


@router.post("/students/{student_id}/hard-delete", status_code=204)
def hard_delete_student(
    student_id: str,
    payload: schemas.PasswordConfirmedDeleteRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_institute_admin),
):
    if not payload.confirm_delete:
        raise HTTPException(status_code=400, detail="Please confirm deletion checkbox")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required")
    if not current_user.password_hash or not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if str(student.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot delete student outside your institute")

    try:
        db.query(models.ExamSession).filter(
            models.ExamSession.institute_id == student.institute_id,
            models.ExamSession.student_id == student.id,
        ).delete(synchronize_session=False)
        db.delete(student)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {exc}") from exc

    return None


@router.post("/students/import", response_model=schemas.StudentImportResponse)
def import_students(
    payload: schemas.StudentImportRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_institute_admin),
):
    institute_id = current_user.institute_id
    if not institute_id:
        raise HTTPException(status_code=400, detail="institute_id is required")

    rows = payload.students or []
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no student rows")

    batches = db.query(models.Batch).filter(models.Batch.institute_id == institute_id).all()
    batch_by_id = {str(batch.id): batch for batch in batches}
    batch_by_code = {(batch.batch_code or "").strip().upper(): batch for batch in batches if batch.batch_code}

    errors: list[str] = []
    seen_emails: set[str] = set()
    seen_roll_keys: set[str] = set()
    resolved_batch_ids: list[str] = []

    for index, row in enumerate(rows, start=1):
        name = row.name.strip()
        email = row.email.strip().lower()
        section = row.section.strip().upper()
        roll_no = row.roll_no.strip().upper()
        password = (row.password or "ChangeMe@123").strip()

        if not name:
            errors.append(f"Row {index}: name is required")
        if not email:
            errors.append(f"Row {index}: email is required")
        elif not EMAIL_PATTERN.match(email):
            errors.append(f"Row {index}: invalid email format")
        if not section:
            errors.append(f"Row {index}: section is required")
        if not roll_no:
            errors.append(f"Row {index}: roll_no is required")
        if len(password) < 8:
            errors.append(f"Row {index}: password must be at least 8 characters")

        batch = None
        if row.batch_id and str(row.batch_id).strip():
            batch = batch_by_id.get(str(row.batch_id).strip())
        elif row.batch_code and row.batch_code.strip():
            batch = batch_by_code.get(row.batch_code.strip().upper())

        if not batch:
            errors.append(f"Row {index}: valid batch_id or batch_code is required")
            resolved_batch_ids.append("")
        else:
            resolved_batch_ids.append(str(batch.id))

        if email:
            if email in seen_emails:
                errors.append(f"Row {index}: duplicate email in CSV ({email})")
            seen_emails.add(email)

        if batch and section and roll_no:
            key = f"{str(batch.id)}:{section}:{roll_no}"
            if key in seen_roll_keys:
                errors.append(f"Row {index}: duplicate batch+section+roll_no in CSV ({section}, {roll_no})")
            seen_roll_keys.add(key)

    if errors:
        raise HTTPException(status_code=400, detail="CSV validation failed: " + "; ".join(errors))

    existing_students = db.query(models.Student).filter(models.Student.institute_id == institute_id).all()
    existing_emails = {student.email.strip().lower() for student in existing_students}
    existing_roll_keys = {
        f"{str(student.batch_id)}:{student.section.strip().upper()}:{student.roll_no.strip().upper()}"
        for student in existing_students
    }

    duplicate_errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        email = row.email.strip().lower()
        section = row.section.strip().upper()
        roll_no = row.roll_no.strip().upper()
        batch_id = resolved_batch_ids[index - 1]

        if email in existing_emails:
            duplicate_errors.append(f"Row {index}: email already exists ({email})")
        roll_key = f"{batch_id}:{section}:{roll_no}"
        if roll_key in existing_roll_keys:
            duplicate_errors.append(f"Row {index}: student already exists in batch with section+roll ({section}, {roll_no})")

    if duplicate_errors:
        raise HTTPException(status_code=409, detail="Redundant data found: " + "; ".join(duplicate_errors))

    try:
        for index, row in enumerate(rows, start=1):
            entity = models.Student(
                institute_id=institute_id,
                batch_id=resolved_batch_ids[index - 1],
                section=row.section.strip().upper(),
                roll_no=row.roll_no.strip().upper(),
                name=row.name.strip(),
                email=row.email.strip().lower(),
                password_hash=get_password_hash((row.password or "ChangeMe@123").strip()),
            )
            db.add(entity)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import students: {exc}") from exc

    return {"created": len(rows)}
