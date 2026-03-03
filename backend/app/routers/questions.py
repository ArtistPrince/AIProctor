from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role
from ..utils.partitions import ensure_tenant_partitions

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])
require_exam_access = require_role(["student", "proctor", "exam_admin", "institute_admin", "super_admin"])


@router.post("/questions/", response_model=schemas.QuestionOut, status_code=201)
def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    exam = db.query(models.Exam).filter(models.Exam.id == question.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role != "super_admin" and str(exam.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Cannot create question outside your institute")

    ensure_tenant_partitions(db, exam.institute_id)

    options = question.data.get("options") if isinstance(question.data, dict) else None
    if not isinstance(options, list) or len(options) == 0:
        raise HTTPException(status_code=400, detail="Question options must be a non-empty list")

    correct_answer = question.data.get("correct_answer")
    if correct_answer is None:
        raise HTTPException(status_code=400, detail="correct_answer is required")

    new_question = models.Question(
        institute_id=exam.institute_id,
        exam_id=exam.id,
        question_text=question.text,
        options=options,
        correct_answer=str(correct_answer),
        marks=question.marks,
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    return schemas.QuestionOut(
        id=str(new_question.id),
        institute_id=str(new_question.institute_id),
        exam_id=str(new_question.exam_id),
        type="MCQ",
        text=new_question.question_text,
        marks=new_question.marks,
        data={"options": new_question.options, "correct_answer": new_question.correct_answer},
    )


@router.get("/questions/", response_model=list[schemas.QuestionOut])
def list_questions(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin),
):
    if current_user.role == "super_admin":
        rows = db.query(models.Question).all()
    else:
        rows = db.query(models.Question).filter(models.Question.institute_id == current_user.institute_id).all()

    return [
        schemas.QuestionOut(
            id=str(row.id),
            institute_id=str(row.institute_id),
            exam_id=str(row.exam_id),
            type="MCQ",
            text=row.question_text,
            marks=row.marks,
            data={"options": row.options, "correct_answer": row.correct_answer},
        )
        for row in rows
    ]


@router.get("/questions/exam/{exam_id}", response_model=list[schemas.QuestionOut])
def list_questions_for_exam(
    exam_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_exam_access),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if current_user.role != "super_admin" and str(exam.institute_id) != str(current_user.institute_id):
        raise HTTPException(status_code=403, detail="Unauthorized to view this exam")

    rows = db.query(models.Question).filter(models.Question.exam_id == exam_id).all()
    return [
        schemas.QuestionOut(
            id=str(row.id),
            institute_id=str(row.institute_id),
            exam_id=str(row.exam_id),
            type="MCQ",
            text=row.question_text,
            marks=row.marks,
            data={"options": row.options, "correct_answer": row.correct_answer},
        )
        for row in rows
    ]
