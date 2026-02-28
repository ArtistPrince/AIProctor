from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role

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
    return faculty


@router.get("/faculties/", response_model=list[schemas.FacultyOut])
def list_faculties(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_read),
):
    if current_user.role == "super_admin":
        return db.query(models.Faculty).all()
    if current_user.institute_id is None:
        return []
    return db.query(models.Faculty).filter(models.Faculty.institute_id == current_user.institute_id).all()
