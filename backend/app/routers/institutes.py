from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_super_admin = require_role(["super_admin"])
require_admin = require_role(["super_admin", "institute_admin"])


@router.post("/institutes/", response_model=schemas.InstituteOut, status_code=201)
def create_institute(
    institute: schemas.InstituteCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_super_admin),
):
    existing = (
        db.query(models.Institute)
        .filter(models.Institute.institute_code == institute.institute_code.upper())
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Institute code already exists")

    new_institute = models.Institute(
        institute_code=institute.institute_code.upper(),
        name=institute.name,
        address=institute.address,
        contact_email=institute.contact_email,
    )
    db.add(new_institute)
    db.commit()
    db.refresh(new_institute)
    return new_institute


@router.get("/institutes/", response_model=list[schemas.InstituteOut])
def list_institutes(
    db: Session = Depends(database.get_db),
    current_user = Depends(require_admin),
):
    if current_user.role == "super_admin":
        return db.query(models.Institute).all()

    if current_user.institute_id is None:
        return []

    institute = db.query(models.Institute).filter(models.Institute.id == current_user.institute_id).first()
    return [institute] if institute else []
