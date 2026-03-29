from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import database, models, schemas
from ..security import require_role, verify_password
from ..utils.partitions import ensure_tenant_partitions

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

    ensure_tenant_partitions(db, institute_id)

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
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "batch_code" in message or "duplicate key" in message or "unique" in message:
            raise HTTPException(status_code=409, detail="Batch already exists")
        raise HTTPException(status_code=400, detail="Invalid batch data")

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

    batch_ids = [row.id for row in rows]
    members_by_batch: dict[str, list[str]] = {}
    if batch_ids:
        student_rows = (
            db.query(models.Student.batch_id, models.Student.student_code, models.Student.id)
            .filter(models.Student.batch_id.in_(batch_ids))
            .all()
        )
        for batch_id, student_code, student_id in student_rows:
            key = str(batch_id)
            if key not in members_by_batch:
                members_by_batch[key] = []
            members_by_batch[key].append(student_code or str(student_id))

    result: list[schemas.BatchOut] = []
    for batch in rows:
        members = members_by_batch.get(str(batch.id), [])
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


@router.put("/batches/{batch_id}", response_model=schemas.BatchOut)
def update_batch(
    batch_id: str,
    payload: schemas.BatchUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_manage),
):
    row = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found")

    if current_user.role != "super_admin" and str(row.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot update batch outside your institute")

    data = payload.model_dump(exclude_unset=True)
    next_course_code = row.course_code
    next_batch_year = row.batch_year

    if "course_name" in data and data["course_name"] is not None:
        row.course_name = data["course_name"].strip()
    if "course_code" in data and data["course_code"] is not None:
        next_course_code = data["course_code"].strip().upper()
    if "batch_year" in data and data["batch_year"] is not None:
        next_batch_year = str(data["batch_year"]).strip()

    if next_course_code != row.course_code or next_batch_year != row.batch_year:
        existing = (
            db.query(models.Batch)
            .filter(models.Batch.institute_id == row.institute_id)
            .filter(models.Batch.course_code == next_course_code)
            .filter(models.Batch.batch_year == next_batch_year)
            .filter(models.Batch.id != row.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Batch with this course and year already exists")

    row.course_code = next_course_code
    row.batch_year = next_batch_year

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "batch_code" in message or "duplicate key" in message or "unique" in message:
            raise HTTPException(status_code=409, detail="Batch already exists")
        raise HTTPException(status_code=400, detail="Invalid batch update")

    db.refresh(row)
    members = [
        student.student_code or str(student.id)
        for student in db.query(models.Student).filter(models.Student.batch_id == row.id).all()
    ]
    return schemas.BatchOut(
        id=str(row.id),
        institute_id=str(row.institute_id),
        course_code=row.course_code,
        batch_year=row.batch_year,
        batch_code=row.batch_code,
        course_name=row.course_name,
        name=row.course_name,
        members=members,
        created_at=row.created_at,
    )


@router.post("/batches/{batch_id}/hard-delete", status_code=204)
def hard_delete_batch(
    batch_id: str,
    payload: schemas.PasswordConfirmedDeleteRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_manage),
):
    if not payload.confirm_delete:
        raise HTTPException(status_code=400, detail="Please confirm deletion checkbox")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Password is required")
    if not current_user.password_hash or not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password")

    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if current_user.role != "super_admin" and str(batch.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot delete batch outside your institute")

    students_count = (
        db.query(models.Student)
        .filter(models.Student.institute_id == batch.institute_id)
        .filter(models.Student.batch_id == batch.id)
        .count()
    )
    if students_count > 0:
        raise HTTPException(status_code=409, detail="Cannot delete batch with assigned students")

    try:
        db.query(models.ExamAssignment).filter(
            models.ExamAssignment.institute_id == batch.institute_id,
            models.ExamAssignment.batch_id == batch.id,
        ).delete(synchronize_session=False)
        db.delete(batch)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {exc}") from exc

    return None


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


@router.post("/batches/import", response_model=schemas.BatchImportResponse)
def import_batches(
    payload: schemas.BatchImportRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_batch_manage),
):
    institute_id = current_user.institute_id
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="Use institute admin account for batch import")
    if not institute_id:
        raise HTTPException(status_code=400, detail="institute_id is required")

    rows = payload.batches or []
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no batch rows")

    errors: list[str] = []
    seen_course_year: set[str] = set()

    for index, row in enumerate(rows, start=1):
        course_name = row.course_name.strip()
        course_code = row.course_code.strip().upper()
        batch_year = str(row.batch_year).strip()

        if not course_name:
            errors.append(f"Row {index}: course_name is required")
        if not course_code:
            errors.append(f"Row {index}: course_code is required")
        if not batch_year:
            errors.append(f"Row {index}: batch_year is required")

        if course_code and batch_year:
            key = f"{course_code}:{batch_year}"
            if key in seen_course_year:
                errors.append(f"Row {index}: duplicate course_code + batch_year in CSV ({course_code}, {batch_year})")
            seen_course_year.add(key)

    if errors:
        raise HTTPException(status_code=400, detail="CSV validation failed: " + "; ".join(errors))

    existing = db.query(models.Batch).filter(models.Batch.institute_id == institute_id).all()
    existing_course_year = {f"{row.course_code.strip().upper()}:{str(row.batch_year).strip()}" for row in existing}

    duplicate_errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        course_code = row.course_code.strip().upper()
        batch_year = str(row.batch_year).strip()
        key = f"{course_code}:{batch_year}"
        if key in existing_course_year:
            duplicate_errors.append(f"Row {index}: batch already exists ({course_code}, {batch_year})")

    if duplicate_errors:
        raise HTTPException(status_code=409, detail="Redundant data found: " + "; ".join(duplicate_errors))

    ensure_tenant_partitions(db, institute_id)

    try:
        for row in rows:
            entity = models.Batch(
                institute_id=institute_id,
                course_code=row.course_code.strip().upper(),
                batch_year=str(row.batch_year).strip(),
                course_name=row.course_name.strip(),
            )
            db.add(entity)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import batches: {exc}") from exc

    return {"created": len(rows)}
