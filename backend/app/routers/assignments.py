from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import uuid

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/assignments/", response_model=schemas.ExamAssignmentOut, status_code=201)
def create_assignment(
    assignment: schemas.ExamAssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    if not assignment.batch_id and not assignment.student_id:
        raise HTTPException(status_code=400, detail="Provide batch_id or student_id")
    if assignment.batch_id and assignment.student_id:
        raise HTTPException(status_code=400, detail="Provide only one of batch_id or student_id")

    exam = db.query(models.Exam).filter(models.Exam.id == assignment.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if assignment.batch_id:
        batch = db.query(models.Batch).filter(models.Batch.id == assignment.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")

    if assignment.student_id:
        student = db.query(models.Student).filter(models.Student.id == assignment.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

    new_assignment = models.ExamAssignment(
        id=str(uuid.uuid4()),
        exam_id=assignment.exam_id,
        batch_id=assignment.batch_id,
        student_id=assignment.student_id,
    )
    db.add(new_assignment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid assignment payload") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to create assignment") from exc
    db.refresh(new_assignment)
    return new_assignment


@router.get("/assignments/", response_model=list[schemas.ExamAssignmentOut])
def list_assignments(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    return db.query(models.ExamAssignment).all()


@router.get("/assignments/me", response_model=list[schemas.ExamAssignmentWithExam])
def list_my_assignments(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["student", "proctor", "exam_admin", "institute_admin", "super_admin"]) ),
):
    candidate_student_ids = {str(current_user.id)}
    candidate_batch_ids = set()
    if getattr(current_user, "email", None):
        linked_students = db.query(models.Student).filter(
            or_(
                models.Student.id == str(current_user.id),
                models.Student.email == current_user.email,
            )
        ).all()
        candidate_student_ids.update(str(student.id) for student in linked_students)
        candidate_batch_ids.update(str(student.batch_id) for student in linked_students if getattr(student, "batch_id", None))

    candidate_member_values = set(candidate_student_ids)
    if getattr(current_user, "email", None):
        candidate_member_values.add(current_user.email)

    batch_ids = set(candidate_batch_ids)
    all_batches = db.query(models.Batch).all()
    for batch in all_batches:
        members = batch.members or []
        if any(str(member) in candidate_member_values for member in members):
            batch_ids.add(batch.id)

    filters = [models.ExamAssignment.student_id.in_(list(candidate_student_ids))]
    if batch_ids:
        filters.append(models.ExamAssignment.batch_id.in_(list(batch_ids)))

    assignments = db.query(models.ExamAssignment).filter(or_(*filters)).all()
    
    # Load exam details for each assignment
    result = []
    for assignment in assignments:
        exam = db.query(models.Exam).filter(models.Exam.id == assignment.exam_id).first()
        if exam:
            result.append({
                "id": assignment.id,
                "exam_id": assignment.exam_id,
                "batch_id": assignment.batch_id,
                "student_id": assignment.student_id,
                "exam": exam
            })
    return result
