from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import uuid

from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import generate_session_public_id

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])
require_exam_access = require_role(["student", "proctor", "exam_admin", "institute_admin", "super_admin"])


@router.post("/questions/", response_model=schemas.QuestionOut, status_code=201)
def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    exam = db.query(models.Exam).filter(models.Exam.id == question.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    new_question = models.Question(
        id=str(uuid.uuid4()),
        exam_id=question.exam_id,
        type=question.type,
        text=question.text,
        marks=question.marks,
        data=question.data,
    )
    db.add(new_question)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid question payload") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to create question") from exc
    db.refresh(new_question)
    return new_question


@router.get("/questions/", response_model=list[schemas.QuestionOut])
def list_questions(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    return db.query(models.Question).all()


@router.get("/questions/exam/{exam_id}", response_model=list[schemas.QuestionOut])
def list_questions_for_exam(
    exam_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_exam_access),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "student":
        reference_time = exam.start_time or exam.end_time
        now = datetime.now(timezone.utc) if reference_time and getattr(reference_time, "tzinfo", None) else datetime.utcnow()
        if exam.start_time and now < exam.start_time:
            raise HTTPException(status_code=403, detail="Exam has not started yet")
        if exam.end_time and now > exam.end_time:
            existing = db.query(models.ExamSession).filter(
                models.ExamSession.student_id == str(current_user.id),
                models.ExamSession.exam_id == exam_id,
            ).first()
            if not existing:
                session = models.ExamSession(
                    id=generate_session_public_id(db, str(current_user.id), exam_id),
                    student_id=str(current_user.id),
                    exam_id=exam_id,
                    status=models.SessionStatus.MISSED,
                    score=0,
                    integrity=0,
                )
                db.add(session)
                db.commit()
            raise HTTPException(status_code=403, detail="Exam window has closed. Marked as missed.")

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

        assignment_filters = [models.ExamAssignment.student_id.in_(list(candidate_student_ids))]
        if batch_ids:
            assignment_filters.append(models.ExamAssignment.batch_id.in_(list(batch_ids)))

        assignment = db.query(models.ExamAssignment).filter(
            (models.ExamAssignment.exam_id == exam_id) &
            or_(*assignment_filters)
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="Exam not assigned")
    return db.query(models.Question).filter(models.Question.exam_id == exam_id).all()
