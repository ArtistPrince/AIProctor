from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import database, models, schemas
from ..security import require_role

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])


@router.get("/users/", response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_value == "super_admin":
        return db.query(models.User).all()

    if current_user.institute_id is None:
        return []

    return db.query(models.User).filter(models.User.institute_id == current_user.institute_id).all()
