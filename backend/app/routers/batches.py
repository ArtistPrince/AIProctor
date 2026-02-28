from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_batch_manage = require_role(["super_admin", "institute_admin"])
require_batch_read = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/batches/", response_model=schemas.BatchOut, status_code=201)
def create_batch(
    batch: schemas.BatchCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_manage),
):
    institute_id = current_user.institute_id
    if current_user.role == "super_admin":
        institute_id = batch.institute_id
    if not institute_id:
        raise HTTPException(status_code=400, detail="institute_id is required")

    existing = (
        db.query(models.Batch)
        .filter(models.Batch.institute_id == institute_id)
        .filter(models.Batch.course_code == batch.course_code.upper())
        .filter(models.Batch.batch_year == str(batch.batch_year))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Batch with this course and year already exists")

    new_batch = models.Batch(
        institute_id=institute_id,
        course_code=batch.course_code.upper(),
        batch_year=str(batch.batch_year),
        course_name=batch.course_name,
    )
    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return schemas.BatchOut(
        id=str(new_batch.id),
        institute_id=str(new_batch.institute_id),
        course_code=new_batch.course_code,
        batch_year=new_batch.batch_year,
        batch_code=new_batch.batch_code,
        course_name=new_batch.course_name,
        name=new_batch.course_name,
        members=batch.members,
        created_at=new_batch.created_at,
    )


@router.get("/batches/", response_model=list[schemas.BatchOut])
def list_batches(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_read),
):
    if current_user.role == "super_admin":
        rows = db.query(models.Batch).all()
    else:
        rows = db.query(models.Batch).filter(models.Batch.institute_id == current_user.institute_id).all()

    result: list[schemas.BatchOut] = []
    for batch in rows:
        members = [
            student.student_code or str(student.id)
            for student in db.query(models.Student).filter(models.Student.batch_id == batch.id).all()
        ]
        result.append(
            schemas.BatchOut(
                id=str(batch.id),
                institute_id=str(batch.institute_id),
                course_code=batch.course_code,
                batch_year=batch.batch_year,
                batch_code=batch.batch_code,
                course_name=batch.course_name,
                name=batch.course_name,
                members=members,
                created_at=batch.created_at,
            )
        )
    return result


@router.post("/batches/{batch_id}/members", response_model=schemas.BatchOut)
def add_members_to_batch(
    batch_id: str,
    member_ids: list[str],
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_manage),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if current_user.role != "super_admin" and str(batch.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot update batch outside your institute")

    for student_id in member_ids:
        student = (
            db.query(models.Student)
            .filter(or_(models.Student.id == student_id, models.Student.student_code == student_id))
            .first()
        )
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
        if str(student.institute_id) != str(batch.institute_id):
            raise HTTPException(status_code=400, detail=f"Student {student_id} belongs to a different institute")
        student.batch_id = batch.id

    db.commit()
    db.refresh(batch)

    members = [
        student.student_code or str(student.id)
        for student in db.query(models.Student).filter(models.Student.batch_id == batch.id).all()
    ]
    return schemas.BatchOut(
        id=str(batch.id),
        institute_id=str(batch.institute_id),
        course_code=batch.course_code,
        batch_year=batch.batch_year,
        batch_code=batch.batch_code,
        course_name=batch.course_name,
        name=batch.course_name,
        members=members,
        created_at=batch.created_at,
    )
