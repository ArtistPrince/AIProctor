from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import (
    department_code_from_name,
    generate_department_public_id,
    institute_short_from_model,
)

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/departments/", response_model=schemas.DepartmentOut, status_code=201)
def create_department(
    payload: schemas.DepartmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    institute = db.query(models.Institute).filter(models.Institute.id == payload.institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value != "super_admin" and current_user.institute_id != payload.institute_id:
        raise HTTPException(status_code=403, detail="Cannot create department outside your institute")

    dept_code = (payload.code or department_code_from_name(payload.name)).upper()[:3]

    existing = (
        db.query(models.Department)
        .filter(models.Department.institute_id == payload.institute_id)
        .filter(models.Department.code == dept_code)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Department code already exists for this institute")

    institute_short = institute_short_from_model(institute)
    public_id = generate_department_public_id(db, institute_short, dept_code)

    department = models.Department(
        id=public_id,
        institute_id=payload.institute_id,
        name=payload.name,
        code=dept_code,
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/departments/", response_model=list[schemas.DepartmentOut])
def list_departments(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "super_admin":
        return db.query(models.Department).all()
    if current_user.institute_id is None:
        return []
    return db.query(models.Department).filter(models.Department.institute_id == current_user.institute_id).all()
