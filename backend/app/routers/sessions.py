from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import generate_session_public_id

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin", "proctor"])


@router.post("/sessions/", response_model=schemas.ExamSessionOut, status_code=201)
def create_session(
    payload: schemas.ExamSessionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["super_admin", "institute_admin", "exam_admin", "proctor", "student"])),
):
    try:
        student = db.query(models.Student).filter(models.Student.id == payload.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        exam = db.query(models.Exam).filter(models.Exam.id == payload.exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")

        # Convert status string to enum
        status = payload.status
        if status and isinstance(status, str):
            try:
                status = models.SessionStatus(status)
            except ValueError:
                # Use default if invalid status provided
                status = models.SessionStatus.SUBMITTED
        else:
            status = models.SessionStatus.SUBMITTED

        public_id = generate_session_public_id(db, student.id, exam.id)
        session = models.ExamSession(
            id=public_id,
            student_id=payload.student_id,
            exam_id=payload.exam_id,
            status=status,
            score=payload.score,
            integrity=payload.integrity,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        print(f"Error creating session: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to save exam session: {str(e)}")


@router.get("/sessions/", response_model=list[schemas.ExamSessionOut])
def list_sessions(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    query = db.query(models.ExamSession)
    if role_value != "super_admin" and current_user.institute_id is not None:
        query = query.join(models.Exam, models.Exam.id == models.ExamSession.exam_id)
        query = query.filter(models.Exam.institute_id == current_user.institute_id)
    return query.all()


@router.get("/sessions/me", response_model=list[schemas.ExamSessionOut])
def list_my_sessions(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["student", "proctor", "exam_admin", "institute_admin", "super_admin"])),
):
    return db.query(models.ExamSession).filter(models.ExamSession.student_id == current_user.id).all()


@router.get("/sessions/exam/{exam_id}", response_model=list[schemas.ExamSessionOut])
def list_exam_attempts(
    exam_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["super_admin", "institute_admin", "exam_admin", "proctor"])),
):
    """Get all exam attempts for a specific exam with student details."""
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value not in ["super_admin"] and current_user.institute_id != exam.institute_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this exam's attempts")
    
    sessions = db.query(models.ExamSession).filter(models.ExamSession.exam_id == exam_id).all()
    return sessions


@router.get("/sessions/exam/{exam_id}/details", response_model=list[dict])
def list_exam_attempts_with_details(
    exam_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["super_admin", "institute_admin", "exam_admin", "proctor"])),
):
    """Get all exam attempts with full student details for a specific exam (for dashboards)."""
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value not in ["super_admin"] and current_user.institute_id != exam.institute_id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this exam's attempts")
    
    sessions = db.query(models.ExamSession).filter(models.ExamSession.exam_id == exam_id).all()
    
    result = []
    for session in sessions:
        student = db.query(models.Student).filter(models.Student.id == session.student_id).first()
        if student:
            result.append({
                "id": session.id,
                "student_id": session.student_id,
                "student_email": student.email,
                "student_name": student.email.split("@")[0],  # Extract name from email
                "exam_id": session.exam_id,
                "status": session.status.value if hasattr(session.status, "value") else str(session.status),
                "score": session.score,
                "integrity": session.integrity,
            })
    
    return result


@router.post("/sessions/exam/{exam_id}/missed", response_model=schemas.ExamSessionOut)
def mark_exam_missed(
    exam_id: str,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_role(["student"]))
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

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

    reference_time = exam.start_time or exam.end_time
    now = datetime.now(timezone.utc) if reference_time and getattr(reference_time, "tzinfo", None) else datetime.utcnow()
    if exam.end_time and now <= exam.end_time:
        raise HTTPException(status_code=403, detail="Exam window has not closed yet")

    existing = db.query(models.ExamSession).filter(
        models.ExamSession.student_id == str(current_user.id),
        models.ExamSession.exam_id == exam_id,
    ).first()
    if existing:
        return existing

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
    db.refresh(session)
    return session
