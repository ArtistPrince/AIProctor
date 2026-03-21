import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import get_password_hash, require_role
from ..utils.partitions import ensure_tenant_partitions

router = APIRouter()
require_super_admin = require_role(["super_admin"])
require_admin = require_role(["super_admin", "institute_admin"])
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@router.post("/institutes/", response_model=schemas.InstituteOut, status_code=201)
def create_institute(
    institute: schemas.InstituteCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(require_super_admin),
):
    existing = (
        db.query(models.Institute)
        .filter(models.Institute.institute_code == institute.institute_code.upper())
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Institute code already exists")

    new_institute = models.Institute(
        institute_code=institute.institute_code.upper(),
        name=institute.name,
        address=institute.address,
        contact_email=institute.contact_email,
    )
    try:
        db.add(new_institute)
        db.flush()
        ensure_tenant_partitions(db, new_institute.id)
        db.commit()
        db.refresh(new_institute)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to provision institute partitions: {exc}") from exc

    return schemas.InstituteOut(
        id=str(new_institute.id),
        institute_code=new_institute.institute_code,
        name=new_institute.name,
        address=new_institute.address,
        contact_email=new_institute.contact_email,
        created_at=new_institute.created_at,
    )


@router.get("/institutes/", response_model=list[schemas.InstituteOut])
def list_institutes(
    db: Session = Depends(database.get_db),
    current_user = Depends(require_admin),
):
    if current_user.role == "super_admin":
        rows = db.query(models.Institute).all()
    elif current_user.institute_id is None:
        rows = []
    else:
        institute = db.query(models.Institute).filter(models.Institute.id == current_user.institute_id).first()
        rows = [institute] if institute else []

    return [
        schemas.InstituteOut(
            id=str(row.id),
            institute_code=row.institute_code,
            name=row.name,
            address=row.address,
            contact_email=row.contact_email,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/institutes/{institute_id}/overview")
def get_institute_overview(
    institute_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_super_admin),
):
    del current_user
    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    admins = db.query(models.InstituteAdmin).filter(models.InstituteAdmin.institute_id == institute.id).all()
    faculties = db.query(models.Faculty).filter(models.Faculty.institute_id == institute.id).all()
    batches = db.query(models.Batch).filter(models.Batch.institute_id == institute.id).all()
    students = db.query(models.Student).filter(models.Student.institute_id == institute.id).all()
    exams = db.query(models.Exam).filter(models.Exam.institute_id == institute.id).all()
    sessions = db.query(models.ExamSession).filter(models.ExamSession.institute_id == institute.id).all()

    return {
        "institute": {
            "id": str(institute.id),
            "institute_code": institute.institute_code,
            "name": institute.name,
            "address": institute.address,
            "contact_email": institute.contact_email,
            "created_at": institute.created_at,
        },
        "counts": {
            "admins": len(admins),
            "faculties": len(faculties),
            "batches": len(batches),
            "students": len(students),
            "exams": len(exams),
            "sessions": len(sessions),
            "violations": len([session for session in sessions if session.violation_found]),
        },
        "admins": [
            {
                "id": str(admin.id),
                "name": admin.name,
                "email": admin.email,
                "emp_id": admin.emp_id,
                "admin_code": admin.admin_code,
                "created_at": admin.created_at,
            }
            for admin in admins
        ],
        "faculties": [
            {
                "id": str(faculty.id),
                "name": faculty.name,
                "email": faculty.email,
                "dept_code": faculty.dept_code,
                "emp_id": faculty.emp_id,
                "faculty_code": faculty.faculty_code,
                "created_at": faculty.created_at,
            }
            for faculty in faculties
        ],
        "batches": [
            {
                "id": str(batch.id),
                "batch_code": batch.batch_code,
                "course_code": batch.course_code,
                "batch_year": batch.batch_year,
                "course_name": batch.course_name,
                "created_at": batch.created_at,
            }
            for batch in batches
        ],
        "students": [
            {
                "id": str(student.id),
                "name": student.name,
                "email": student.email,
                "batch_id": str(student.batch_id),
                "section": student.section,
                "roll_no": student.roll_no,
                "student_code": student.student_code,
                "created_at": student.created_at,
            }
            for student in students
        ],
        "exams": [
            {
                "id": str(exam.id),
                "title": exam.title,
                "subject_code": exam.subject_code,
                "exam_type": exam.exam_type,
                "exam_year": exam.exam_year,
                "duration_minutes": exam.duration_minutes,
                "passing_marks": exam.passing_marks,
                "scheduled_time": exam.scheduled_time,
                "end_time": exam.end_time,
            }
            for exam in exams
        ],
        "sessions": [
            {
                "id": str(session.id),
                "exam_id": str(session.exam_id),
                "student_id": str(session.student_id),
                "status": session.session_status,
                "score": session.final_score,
                "violation_found": session.violation_found,
                "started_at": session.started_at,
                "completed_at": session.completed_at,
            }
            for session in sessions
        ],
    }


@router.put("/institutes/{institute_id}", response_model=schemas.InstituteOut)
def update_institute(
    institute_id: str,
    payload: schemas.InstituteUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_super_admin),
):
    del current_user
    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        institute.name = data["name"]
    if "address" in data:
        institute.address = data["address"]
    if "contact_email" in data:
        institute.contact_email = data["contact_email"]

    db.commit()
    db.refresh(institute)

    return schemas.InstituteOut(
        id=str(institute.id),
        institute_code=institute.institute_code,
        name=institute.name,
        address=institute.address,
        contact_email=institute.contact_email,
        created_at=institute.created_at,
    )


@router.delete("/institutes/{institute_id}", status_code=204)
def delete_institute(
    institute_id: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_super_admin),
):
    del current_user
    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    try:
        db.delete(institute)
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete institute: {exc}") from exc

    return None


@router.put("/institutes/{institute_id}/admin-password")
def reset_institute_admin_password(
    institute_id: str,
    payload: schemas.InstituteAdminPasswordReset,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_super_admin),
):
    del current_user
    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    admins_query = db.query(models.InstituteAdmin).filter(models.InstituteAdmin.institute_id == institute_id)
    if payload.admin_email:
        admins_query = admins_query.filter(models.InstituteAdmin.email == payload.admin_email)

    admins = admins_query.all()
    if not admins:
        raise HTTPException(status_code=404, detail="Institute admin not found")

    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    try:
        password_hash = get_password_hash(payload.new_password)
        for admin in admins:
            admin.password_hash = password_hash
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset admin password: {exc}") from exc

    return {"updated": len(admins)}


@router.post("/institutes/{institute_id}/admins/import", response_model=schemas.InstituteAdminImportResponse)
def import_institute_admins(
    institute_id: str,
    payload: schemas.InstituteAdminImportRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_super_admin),
):
    del current_user
    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    rows = payload.admins or []
    if not rows:
        raise HTTPException(status_code=400, detail="CSV has no admin rows")

    validation_errors: list[str] = []
    seen_emails: set[str] = set()
    seen_emp_ids: set[str] = set()

    for index, row in enumerate(rows, start=1):
        name = row.name.strip()
        email = row.email.strip().lower()
        password = row.password
        emp_id = (row.emp_id or "").strip().upper()

        if not name:
            validation_errors.append(f"Row {index}: name is required")
        if not email:
            validation_errors.append(f"Row {index}: email is required")
        elif not EMAIL_PATTERN.match(email):
            validation_errors.append(f"Row {index}: invalid email format")
        if not password or len(password) < 8:
            validation_errors.append(f"Row {index}: password must be at least 8 characters")

        if email:
            if email in seen_emails:
                validation_errors.append(f"Row {index}: duplicate email in CSV ({email})")
            seen_emails.add(email)

        if emp_id:
            if emp_id in seen_emp_ids:
                validation_errors.append(f"Row {index}: duplicate emp_id in CSV ({emp_id})")
            seen_emp_ids.add(emp_id)

    if validation_errors:
        raise HTTPException(status_code=400, detail="CSV validation failed: " + "; ".join(validation_errors))

    existing_admins = db.query(models.InstituteAdmin).filter(models.InstituteAdmin.institute_id == institute_id).all()
    existing_emails = {admin.email.strip().lower() for admin in existing_admins}
    existing_emp_ids = {admin.emp_id.strip().upper() for admin in existing_admins if admin.emp_id}

    duplicate_errors: list[str] = []
    for index, row in enumerate(rows, start=1):
        email = row.email.strip().lower()
        emp_id = (row.emp_id or "").strip().upper()

        if email in existing_emails:
            duplicate_errors.append(f"Row {index}: email already exists ({email})")
        if emp_id and emp_id in existing_emp_ids:
            duplicate_errors.append(f"Row {index}: emp_id already exists ({emp_id})")

    if duplicate_errors:
        raise HTTPException(status_code=409, detail="Redundant data found: " + "; ".join(duplicate_errors))

    ensure_tenant_partitions(db, institute_id)

    try:
        for index, row in enumerate(rows, start=1):
            emp_id = (row.emp_id or "").strip().upper() or f"ADM{index:04d}{str(institute.id).replace('-', '')[:4].upper()}"
            entity = models.InstituteAdmin(
                institute_id=institute.id,
                emp_id=emp_id,
                name=row.name.strip(),
                email=row.email.strip().lower(),
                password_hash=get_password_hash(row.password),
            )
            db.add(entity)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import admins: {exc}") from exc

    return {"created": len(rows)}
