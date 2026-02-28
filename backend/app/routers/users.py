from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.get("/users/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(database.get_db),
    current_user = Depends(require_admin),
):
    users: list[schemas.UserOut] = []

    if current_user.role == "super_admin":
        for user in db.query(models.SuperAdmin).all():
            users.append(schemas.UserOut(id=str(user.id), email=user.email, role="super_admin", name="Super Admin"))

        for user in db.query(models.InstituteAdmin).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    email=user.email,
                    role="institute_admin",
                    name=user.name,
                    code=user.admin_code,
                )
            )

        for user in db.query(models.Faculty).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    email=user.email,
                    role="exam_admin",
                    name=user.name,
                    code=user.faculty_code,
                )
            )

        for user in db.query(models.Student).all():
            users.append(
                schemas.UserOut(
                    id=str(user.id),
                    institute_id=str(user.institute_id),
                    batch_id=str(user.batch_id),
                    email=user.email,
                    role="student",
                    name=user.name,
                    code=user.student_code,
                )
            )
        return users

    if current_user.institute_id is None:
        return []

    institute_id = current_user.institute_id
    for user in db.query(models.InstituteAdmin).filter(models.InstituteAdmin.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                email=user.email,
                role="institute_admin",
                name=user.name,
                code=user.admin_code,
            )
        )
    for user in db.query(models.Faculty).filter(models.Faculty.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                email=user.email,
                role="exam_admin",
                name=user.name,
                code=user.faculty_code,
            )
        )
    for user in db.query(models.Student).filter(models.Student.institute_id == institute_id).all():
        users.append(
            schemas.UserOut(
                id=str(user.id),
                institute_id=str(user.institute_id),
                batch_id=str(user.batch_id),
                email=user.email,
                role="student",
                name=user.name,
                code=user.student_code,
            )
        )
    return users
