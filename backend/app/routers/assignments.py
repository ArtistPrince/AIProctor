from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


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

    new_assignment = models.ExamAssignment(
        institute_id=exam.institute_id,
        exam_id=exam.id,
        batch_id=batch.id,
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return schemas.ExamAssignmentOut(
        id=str(new_assignment.id),
        institute_id=str(new_assignment.institute_id),
        exam_id=str(new_assignment.exam_id),
        batch_id=str(new_assignment.batch_id),
        student_id=None,
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

    return [
        schemas.ExamAssignmentOut(
            id=str(row.id),
            institute_id=str(row.institute_id),
            exam_id=str(row.exam_id),
            batch_id=str(row.batch_id),
            student_id=None,
            assigned_at=row.assigned_at,
        )
        for row in rows
    ]


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

    result: list[schemas.ExamAssignmentWithExam] = []
    for assignment in assignments:
        exam = db.query(models.Exam).filter(models.Exam.id == assignment.exam_id).first()
        if not exam:
            continue
        result.append(
            schemas.ExamAssignmentWithExam(
                id=str(assignment.id),
                exam_id=str(assignment.exam_id),
                batch_id=str(assignment.batch_id),
                student_id=None,
                exam=schemas.ExamOut(
                    id=str(exam.id),
                    institute_id=str(exam.institute_id),
                    faculty_id=str(exam.faculty_id),
                    subject_code=exam.subject_code,
                    exam_type=exam.exam_type,
                    exam_year=exam.exam_year,
                    exam_code=exam.exam_code,
                    title=exam.title,
                    duration_minutes=exam.duration_minutes,
                    passing_marks=exam.passing_marks,
                    scheduled_time=exam.scheduled_time,
                    created_at=exam.created_at,
                    duration=exam.duration_minutes,
                ),
            )
        )
    return result
