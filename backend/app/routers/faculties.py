from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role
from ..utils.partitions import ensure_tenant_partitions

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin"])
require_read = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/faculties/", response_model=schemas.FacultyOut, status_code=201)
def create_faculty(
    payload: schemas.FacultyCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role != "super_admin" and current_user.institute_id != payload.institute_id:
        raise HTTPException(status_code=403, detail="Cannot create faculty outside your institute")

    existing = db.query(models.Faculty).filter(models.Faculty.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Faculty with this email already exists")

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
    db.commit()
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
