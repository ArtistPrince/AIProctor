from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.partitions import ensure_tenant_partitions

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
    try:
        db.add(new_institute)
        db.flush()
        ensure_tenant_partitions(db, new_institute.id)
        db.commit()
        db.refresh(new_institute)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to provision institute partitions: {exc}") from exc

    return schemas.InstituteOut(
        id=str(new_institute.id),
        institute_code=new_institute.institute_code,
        name=new_institute.name,
        address=new_institute.address,
        contact_email=new_institute.contact_email,
        created_at=new_institute.created_at,
    )


@router.get("/institutes/", response_model=list[schemas.InstituteOut])
def list_institutes(
    db: Session = Depends(database.get_db),
    current_user = Depends(require_admin),
):
    if current_user.role == "super_admin":
        rows = db.query(models.Institute).all()
    elif current_user.institute_id is None:
        rows = []
    else:
        institute = db.query(models.Institute).filter(models.Institute.id == current_user.institute_id).first()
        rows = [institute] if institute else []

    return [
        schemas.InstituteOut(
            id=str(row.id),
            institute_code=row.institute_code,
            name=row.name,
            address=row.address,
            contact_email=row.contact_email,
            created_at=row.created_at,
        )
        for row in rows
    ]
