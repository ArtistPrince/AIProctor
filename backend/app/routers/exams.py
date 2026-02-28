from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.post("/exams/", response_model=schemas.ExamOut)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    target_faculty_id = exam.faculty_id
    if current_user.role == "exam_admin":
        target_faculty_id = current_user.id

    if not target_faculty_id:
        raise HTTPException(status_code=400, detail="faculty_id is required")

    faculty = db.query(models.Faculty).filter(models.Faculty.id == target_faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    institute_id = str(faculty.institute_id)
    if current_user.role != "super_admin" and current_user.institute_id != institute_id:
        raise HTTPException(status_code=403, detail="Cannot create exam outside your institute")

    new_exam = models.Exam(
        institute_id=faculty.institute_id,
        faculty_id=faculty.id,
        subject_code=exam.subject_code.upper(),
        exam_type=exam.exam_type.upper(),
        exam_year=str(exam.exam_year),
        title=exam.title,
        duration_minutes=exam.duration_minutes,
        passing_marks=exam.passing_marks,
        scheduled_time=exam.scheduled_time,
        end_time=exam.end_time,
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return schemas.ExamOut(
        id=str(new_exam.id),
        institute_id=str(new_exam.institute_id),
        faculty_id=str(new_exam.faculty_id),
        subject_code=new_exam.subject_code,
        exam_type=new_exam.exam_type,
        exam_year=new_exam.exam_year,
        exam_code=new_exam.exam_code,
        title=new_exam.title,
        duration_minutes=new_exam.duration_minutes,
        passing_marks=new_exam.passing_marks,
        scheduled_time=new_exam.scheduled_time,
        end_time=new_exam.end_time,
        created_at=new_exam.created_at,
        duration=new_exam.duration_minutes,
    )


@router.get("/exams/", response_model=list[schemas.ExamOut])
def list_exams(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role == "super_admin":
        exams = db.query(models.Exam).all()
    else:
        exams = db.query(models.Exam).filter(models.Exam.institute_id == current_user.institute_id).all()

    return [
        schemas.ExamOut(
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
            end_time=exam.end_time,
            created_at=exam.created_at,
            duration=exam.duration_minutes,
        )
        for exam in exams
    ]
