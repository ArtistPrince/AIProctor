from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import database, models, schemas
from ..security import require_role
from ..utils.key_generator import generate_exam_public_id, institute_short_from_model

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])

@router.post("/exams/", response_model=schemas.ExamOut)
def create_exam(
    exam: schemas.ExamCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    department = db.query(models.Department).filter(models.Department.id == exam.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    institute_id = department.institute_id
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value != "super_admin" and current_user.institute_id != institute_id:
        raise HTTPException(status_code=403, detail="Cannot create exam outside your institute")

    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    institute_short = institute_short_from_model(institute)
    public_id = generate_exam_public_id(db, institute_short, department.code)

    new_exam = models.Exam(
        id=public_id,
        title=exam.title,
        duration=exam.duration,
        start_time=exam.start_time,
        end_time=exam.end_time,
        proctor_config=exam.proctor_config,
        random_rules=exam.random_rules,
        institute_id=institute_id,
        department_id=exam.department_id,
    )
    db.add(new_exam)
    db.commit()
    db.refresh(new_exam)
    return new_exam

@router.get("/exams/", response_model=list[schemas.ExamOut])
def list_exams(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "super_admin":
        return db.query(models.Exam).all()
    return db.query(models.Exam).filter(models.Exam.institute_id == current_user.institute_id).all()
