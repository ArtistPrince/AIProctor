from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import generate_batch_public_id

router = APIRouter()
require_batch_manage = require_role(["super_admin", "institute_admin"])
require_batch_read = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/batches/", response_model=schemas.BatchOut, status_code=201)
def create_batch(
    batch: schemas.BatchCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_batch_manage),
):
    existing = db.query(models.Batch).filter(models.Batch.name == batch.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Batch name already exists")

    department = db.query(models.Department).filter(models.Department.id == batch.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    institute_id = department.institute_id
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value != "super_admin" and current_user.institute_id != institute_id:
        raise HTTPException(status_code=403, detail="Cannot create batch outside your institute")

    public_id = generate_batch_public_id(db, department.code, batch.batch_year)

    new_batch = models.Batch(
        id=public_id,
        name=batch.name,
        members=[str(member_id) for member_id in batch.members],
        institute_id=institute_id,
        department_id=batch.department_id,
        batch_year=batch.batch_year,
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_batch


@router.get("/batches/", response_model=list[schemas.BatchOut])
def list_batches(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_batch_read),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "super_admin":
        return db.query(models.Batch).all()
    return db.query(models.Batch).filter(models.Batch.institute_id == current_user.institute_id).all()


@router.post("/batches/{batch_id}/members", response_model=schemas.BatchOut)
def add_members_to_batch(
    batch_id: str,
    member_ids: list[str],
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_batch_manage),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    existing_ids = set(batch.members or [])
    for student_id in member_ids:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
        existing_ids.add(str(student_id))

    batch.members = sorted(existing_ids)
    db.commit()
    db.refresh(batch)
    return batch
