from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.partitions import ensure_tenant_partitions

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


def _fetch_exam_map(db: Session, exam_ids: set) -> dict:
    if not exam_ids:
        return {}
    rows = (
        db.query(
            models.Exam.id,
            models.Exam.institute_id,
            models.Exam.faculty_id,
            models.Exam.subject_code,
            models.Exam.exam_type,
            models.Exam.exam_year,
            models.Exam.exam_code,
            models.Exam.title,
            models.Exam.duration_minutes,
            models.Exam.passing_marks,
            models.Exam.scheduled_time,
            models.Exam.end_time,
            models.Exam.created_at,
        )
        .filter(models.Exam.id.in_(list(exam_ids)))
        .all()
    )
    return {
        str(exam_id): {
            "id": str(exam_id),
            "institute_id": str(institute_id),
            "faculty_id": str(faculty_id),
            "subject_code": subject_code,
            "exam_type": exam_type,
            "exam_year": exam_year,
            "exam_code": exam_code,
            "title": title,
            "duration_minutes": duration_minutes,
            "passing_marks": passing_marks,
            "scheduled_time": scheduled_time,
            "end_time": end_time,
            "created_at": created_at,
        }
        for (
            exam_id,
            institute_id,
            faculty_id,
            subject_code,
            exam_type,
            exam_year,
            exam_code,
            title,
            duration_minutes,
            passing_marks,
            scheduled_time,
            end_time,
            created_at,
        ) in rows
    }


def _fetch_batch_code_map(db: Session, batch_ids: set) -> dict:
    if not batch_ids:
        return {}
    rows = db.query(models.Batch.id, models.Batch.batch_code).filter(models.Batch.id.in_(list(batch_ids))).all()
    return {str(batch_id): batch_code for batch_id, batch_code in rows}


@router.post("/assignments/", response_model=schemas.ExamAssignmentOut, status_code=201)
def create_assignment(
    assignment: schemas.ExamAssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    exam = db.query(models.Exam).filter(models.Exam.id == assignment.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    batch = db.query(models.Batch).filter(models.Batch.id == assignment.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if str(exam.institute_id) != str(batch.institute_id):
        raise HTTPException(status_code=400, detail="Exam and batch belong to different institutes")

    if current_user.role != "super_admin" and str(exam.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot assign exam outside your institute")

    ensure_tenant_partitions(db, exam.institute_id)

    new_assignment = models.ExamAssignment(
        institute_id=exam.institute_id,
        exam_id=exam.id,
        batch_id=batch.id,
    )
    db.add(new_assignment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid assignment data")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create assignment: {exc}") from exc

    db.refresh(new_assignment)
    return schemas.ExamAssignmentOut(
        id=str(new_assignment.id),
        institute_id=str(new_assignment.institute_id),
        exam_id=str(new_assignment.exam_id),
        exam_code=exam.exam_code,
        batch_id=str(new_assignment.batch_id),
        batch_code=batch.batch_code,
        student_id=None,
        student_code=None,
        assigned_at=new_assignment.assigned_at,
    )


@router.get("/assignments/", response_model=list[schemas.ExamAssignmentOut])
def list_assignments(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role == "super_admin":
        rows = db.query(models.ExamAssignment).all()
    else:
        rows = db.query(models.ExamAssignment).filter(models.ExamAssignment.institute_id == current_user.institute_id).all()

    exam_map = _fetch_exam_map(db, {str(row.exam_id) for row in rows})
    batch_code_map = _fetch_batch_code_map(db, {str(row.batch_id) for row in rows})

    result: list[schemas.ExamAssignmentOut] = []
    for row in rows:
        exam = exam_map.get(str(row.exam_id))
        result.append(
            schemas.ExamAssignmentOut(
                id=str(row.id),
                institute_id=str(row.institute_id),
                exam_id=str(row.exam_id),
                exam_code=exam["exam_code"] if exam else None,
                batch_id=str(row.batch_id),
                batch_code=batch_code_map.get(str(row.batch_id)),
                student_id=None,
                student_code=None,
                assigned_at=row.assigned_at,
            )
        )
    return result


@router.get("/assignments/me", response_model=list[schemas.ExamAssignmentWithExam])
def list_my_assignments(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["student", "proctor", "exam_admin", "institute_admin", "super_admin"])),
):
    if current_user.role == "student":
        student = db.query(models.Student).filter(models.Student.id == current_user.id).first()
        if not student:
            return []
        assignments = db.query(models.ExamAssignment).filter(
            models.ExamAssignment.institute_id == student.institute_id,
            models.ExamAssignment.batch_id == student.batch_id,
        ).all()
    elif current_user.role == "super_admin":
        assignments = db.query(models.ExamAssignment).all()
    else:
        assignments = db.query(models.ExamAssignment).filter(models.ExamAssignment.institute_id == current_user.institute_id).all()

    exam_map = _fetch_exam_map(db, {str(item.exam_id) for item in assignments})
    batch_code_map = _fetch_batch_code_map(db, {str(item.batch_id) for item in assignments})

    result: list[schemas.ExamAssignmentWithExam] = []
    for assignment in assignments:
        exam = exam_map.get(str(assignment.exam_id))
        if not exam:
            continue
        result.append(
            schemas.ExamAssignmentWithExam(
                id=str(assignment.id),
                exam_id=str(assignment.exam_id),
                batch_id=str(assignment.batch_id),
                batch_code=batch_code_map.get(str(assignment.batch_id)),
                student_id=None,
                student_code=None,
                exam=schemas.ExamOut(
                    id=exam["id"],
                    institute_id=exam["institute_id"],
                    faculty_id=exam["faculty_id"],
                    subject_code=exam["subject_code"],
                    exam_type=exam["exam_type"],
                    exam_year=exam["exam_year"],
                    exam_code=exam["exam_code"],
                    title=exam["title"],
                    duration_minutes=exam["duration_minutes"],
                    passing_marks=exam["passing_marks"],
                    scheduled_time=exam["scheduled_time"],
                    end_time=exam["end_time"],
                    created_at=exam["created_at"],
                    duration=exam["duration_minutes"],
                ),
            )
        )
    return result
