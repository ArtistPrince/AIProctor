from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/departments/", response_model=schemas.DepartmentOut, status_code=201)
def create_department(
    payload: schemas.FacultyCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    role_value = current_user.role
    if role_value != "super_admin" and current_user.institute_id != payload.institute_id:
        raise HTTPException(status_code=403, detail="Cannot create faculty outside your institute")

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
    return schemas.DepartmentOut(
        id=str(faculty.id),
        institute_id=str(faculty.institute_id),
        name=faculty.name,
        code=faculty.dept_code,
    )


@router.get("/departments/", response_model=list[schemas.DepartmentOut])
def list_departments(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role == "super_admin":
        faculties = db.query(models.Faculty).all()
    else:
        if current_user.institute_id is None:
            return []
        faculties = db.query(models.Faculty).filter(models.Faculty.institute_id == current_user.institute_id).all()

    return [
        schemas.DepartmentOut(
            id=str(faculty.id),
            institute_id=str(faculty.institute_id),
            name=faculty.name,
            code=faculty.dept_code,
        )
        for faculty in faculties
    ]
