from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import generate_institute_public_id

router = APIRouter()
require_super_admin = require_role(["super_admin"])
require_admin = require_role(["super_admin", "institute_admin"])


@router.post("/institutes/", response_model=schemas.InstituteOut, status_code=201)
def create_institute(
    institute: schemas.InstituteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_super_admin),
):
    existing = db.query(models.Institute).filter(models.Institute.name == institute.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Institute already exists")

    new_institute = models.Institute(
        id=generate_institute_public_id(db, institute.name),
        name=institute.name,
        plan=institute.plan,
        config=institute.config,
    )
    db.add(new_institute)
    db.commit()
    db.refresh(new_institute)
    return new_institute


@router.get("/institutes/", response_model=list[schemas.InstituteOut])
def list_institutes(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "super_admin":
        return db.query(models.Institute).all()

    if current_user.institute_id is None:
        return []

    institute = db.query(models.Institute).filter(models.Institute.id == current_user.institute_id).first()
    return [institute] if institute else []
