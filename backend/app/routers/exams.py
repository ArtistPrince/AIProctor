from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.partitions import ensure_tenant_partitions

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

    if current_user.role == "institute_admin" and not target_faculty_id:
        default_faculty = (
            db.query(models.Faculty)
            .filter(models.Faculty.institute_id == current_user.institute_id)
            .order_by(models.Faculty.created_at.asc())
            .first()
        )
        if not default_faculty:
            raise HTTPException(status_code=400, detail="No faculty found in institute. Create a faculty account first.")
        target_faculty_id = str(default_faculty.id)

    if not target_faculty_id:
        raise HTTPException(status_code=400, detail="faculty_id is required")

    faculty = db.query(models.Faculty).filter(models.Faculty.id == target_faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    institute_id = str(faculty.institute_id)
    if current_user.role != "super_admin" and current_user.institute_id != institute_id:
        raise HTTPException(status_code=403, detail="Cannot create exam outside your institute")

    ensure_tenant_partitions(db, institute_id)

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
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "exam_code" in message or "duplicate key" in message or "unique" in message:
            raise HTTPException(status_code=409, detail="Exam with similar generated code already exists")
        raise HTTPException(status_code=400, detail="Invalid exam data")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create exam: {exc}") from exc

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


@router.put("/exams/{exam_id}", response_model=schemas.ExamOut)
def update_exam(
    exam_id: str,
    payload: schemas.ExamUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    row = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role != "super_admin" and str(row.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot update exam outside your institute")

    if current_user.role == "exam_admin" and str(row.faculty_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Cannot update exams created by other faculty")

    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] is not None:
        row.title = data["title"]
    if "duration_minutes" in data and data["duration_minutes"] is not None:
        row.duration_minutes = data["duration_minutes"]
    if "passing_marks" in data and data["passing_marks"] is not None:
        row.passing_marks = data["passing_marks"]
    if "scheduled_time" in data:
        row.scheduled_time = data["scheduled_time"]
    if "end_time" in data:
        row.end_time = data["end_time"]

    db.commit()
    db.refresh(row)
    return schemas.ExamOut(
        id=str(row.id),
        institute_id=str(row.institute_id),
        faculty_id=str(row.faculty_id),
        subject_code=row.subject_code,
        exam_type=row.exam_type,
        exam_year=row.exam_year,
        exam_code=row.exam_code,
        title=row.title,
        duration_minutes=row.duration_minutes,
        passing_marks=row.passing_marks,
        scheduled_time=row.scheduled_time,
        end_time=row.end_time,
        created_at=row.created_at,
        duration=row.duration_minutes,
    )
