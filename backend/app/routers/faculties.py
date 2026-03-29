import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role, verify_password
from ..utils.partitions import ensure_tenant_partitions

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin"])
require_read = require_role(["super_admin", "institute_admin", "exam_admin"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/faculties/", response_model=schemas.FacultyOut, status_code=201)
def create_faculty(
    payload: schemas.FacultyCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role != "super_admin" and current_user.institute_id != payload.institute_id:
        raise HTTPException(status_code=403, detail="Cannot create faculty outside your institute")

    existing = (
        db.query(models.Faculty)
        .filter(models.Faculty.institute_id == payload.institute_id)
        .filter(models.Faculty.email == payload.email)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Faculty with this email already exists")

    existing_emp = (
        db.query(models.Faculty)
        .filter(models.Faculty.institute_id == payload.institute_id)
        .filter(models.Faculty.dept_code == payload.dept_code.upper())
        .filter(models.Faculty.emp_id == payload.emp_id)
        .first()
    )
    if existing_emp:
        raise HTTPException(status_code=409, detail="Faculty with this department and employee ID already exists")

    ensure_tenant_partitions(db, payload.institute_id)
    faculty = models.Faculty(
        institute_id=payload.institute_id,
        dept_code=payload.dept_code.upper(),
        emp_id=payload.emp_id,
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash("ChangeMe@123"),
    )
    db.add(faculty)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "faculty_code" in message or "duplicate key" in message or "unique" in message:
            raise HTTPException(status_code=409, detail="Faculty already exists with same generated code")
        if "institute_id" in message or "foreign key" in message:
            raise HTTPException(status_code=400, detail="Invalid institute_id for faculty creation")
        raise HTTPException(status_code=400, detail="Invalid faculty data")

    db.refresh(faculty)
    return schemas.FacultyOut(
        id=str(faculty.id),
        institute_id=str(faculty.institute_id),
        name=faculty.name,
        dept_code=faculty.dept_code,
        emp_id=faculty.emp_id,
        faculty_code=faculty.faculty_code,
        email=faculty.email,
    )


@router.get("/faculties/", response_model=list[schemas.FacultyOut])
def list_faculties(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_read),
):
    if current_user.role == "super_admin":
        rows = db.query(models.Faculty).all()
    elif current_user.institute_id is None:
        rows = []
    else:
        rows = db.query(models.Faculty).filter(models.Faculty.institute_id == current_user.institute_id).all()

    return [
        schemas.FacultyOut(
            id=str(row.id),
            institute_id=str(row.institute_id),
            name=row.name,
            dept_code=row.dept_code,
            emp_id=row.emp_id,
            faculty_code=row.faculty_code,
            email=row.email,
        )
        for row in rows
    ]


@router.put("/faculties/{faculty_id}", response_model=schemas.FacultyOut)
def update_faculty(
    faculty_id: str,
    payload: schemas.FacultyUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    row = db.query(models.Faculty).filter(models.Faculty.id == faculty_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if current_user.role != "super_admin" and str(row.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot update faculty outside your institute")

    data = payload.model_dump(exclude_unset=True)

    email = data.get("email")
    if email and email != row.email:
        existing = (
            db.query(models.Faculty)
            .filter(models.Faculty.institute_id == row.institute_id)
            .filter(models.Faculty.email == email)
            .filter(models.Faculty.id != row.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Faculty with this email already exists")
        row.email = email

    if "name" in data and data["name"] is not None:
        row.name = data["name"]
    if "dept_code" in data and data["dept_code"] is not None:
        row.dept_code = data["dept_code"].upper()

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "faculty_code" in message or "duplicate key" in message or "unique" in message:
            raise HTTPException(status_code=409, detail="Faculty already exists with same generated code")
        raise HTTPException(status_code=400, detail="Invalid faculty update")

    db.refresh(row)
    return schemas.FacultyOut(
        id=str(row.id),
        institute_id=str(row.institute_id),
        name=row.name,
        dept_code=row.dept_code,
        emp_id=row.emp_id,
        faculty_code=row.faculty_code,
        email=row.email,
    )


@router.post("/faculties/{faculty_id}/hard-delete", status_code=204)
def hard_delete_faculty(
    faculty_id: str,
    payload: schemas.PasswordConfirmedDeleteRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if not payload.confirm_delete:
        raise HTTPException(status_code=400, detail="Please confirm deletion checkbox")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required")
    if not current_user.password_hash or not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    faculty = db.query(models.Faculty).filter(models.Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    if current_user.role != "super_admin" and str(faculty.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot delete faculty outside your institute")

    exams_count = (
        db.query(models.Exam)
        .filter(models.Exam.institute_id == faculty.institute_id)
        .filter(models.Exam.faculty_id == faculty.id)
        .count()
    )
    if exams_count > 0:
        raise HTTPException(status_code=409, detail="Cannot delete faculty with linked exams")

    try:
        db.delete(faculty)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete faculty: {exc}") from exc

    return None


@router.post("/faculties/import", response_model=schemas.FacultyImportResponse)
def import_faculties(
    payload: schemas.FacultyImportRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    institute_id = current_user.institute_id
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Use institute admin account for faculty import")
    if not institute_id:
        raise HTTPException(status_code=400, detail="institute_id is required")

    rows = payload.faculties or []
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no faculty rows")

    errors: list[str] = []
    seen_emails: set[str] = set()
    seen_dept_emp: set[str] = set()

    for index, row in enumerate(rows, start=1):
        name = row.name.strip()
        email = row.email.strip().lower()
        dept_code = row.dept_code.strip().upper()
        emp_id = (row.emp_id or "").strip().upper()

        if not name:
            errors.append(f"Row {index}: name is required")
        if not email:
            errors.append(f"Row {index}: email is required")
        elif not EMAIL_PATTERN.match(email):
            errors.append(f"Row {index}: invalid email format")
        if not dept_code:
            errors.append(f"Row {index}: dept_code is required")

        if email:
            if email in seen_emails:
                errors.append(f"Row {index}: duplicate email in CSV ({email})")
            seen_emails.add(email)

        if dept_code and emp_id:
            key = f"{dept_code}:{emp_id}"
            if key in seen_dept_emp:
                errors.append(f"Row {index}: duplicate dept_code + emp_id in CSV ({dept_code}, {emp_id})")
            seen_dept_emp.add(key)

    if errors:
        raise HTTPException(status_code=400, detail="CSV validation failed: " + "; ".join(errors))

    existing = db.query(models.Faculty).filter(models.Faculty.institute_id == institute_id).all()
    existing_emails = {row.email.strip().lower() for row in existing}
    existing_dept_emp = {f"{row.dept_code.strip().upper()}:{row.emp_id.strip().upper()}" for row in existing}

    duplicate_errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        email = row.email.strip().lower()
        dept_code = row.dept_code.strip().upper()
        emp_id = (row.emp_id or "").strip().upper()

        if email in existing_emails:
            duplicate_errors.append(f"Row {index}: email already exists ({email})")
        if dept_code and emp_id and f"{dept_code}:{emp_id}" in existing_dept_emp:
            duplicate_errors.append(f"Row {index}: dept_code + emp_id already exists ({dept_code}, {emp_id})")

    if duplicate_errors:
        raise HTTPException(status_code=409, detail="Redundant data found: " + "; ".join(duplicate_errors))

    ensure_tenant_partitions(db, institute_id)

    try:
        for index, row in enumerate(rows, start=1):
            dept_code = row.dept_code.strip().upper()
            emp_id = (row.emp_id or "").strip().upper() or f"EMP{index:04d}{str(institute_id).replace('-', '')[:4].upper()}"
            entity = models.Faculty(
                institute_id=institute_id,
                dept_code=dept_code,
                emp_id=emp_id,
                name=row.name.strip(),
                email=row.email.strip().lower(),
                password_hash=get_password_hash("ChangeMe@123"),
            )
            db.add(entity)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import faculties: {exc}") from exc

    return {"created": len(rows)}
