from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from .. import database, models, schemas
from ..security import verify_password, create_access_token, get_current_user, get_password_hash, require_role
from ..utils.key_generator import generate_student_public_id, institute_short_from_model
import shutil
import os
import uuid
from typing import Optional
import numpy as np
from PIL import Image

try:
    import face_recognition
except ImportError:  # pragma: no cover - runtime dependency check
    face_recognition = None

router = APIRouter()
require_admin = require_role(["super_admin", "institute_admin", "exam_admin"])

# Directory to save verification images locally
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _load_image(path: str) -> np.ndarray:
    with Image.open(path).convert("RGB") as img:
        return np.array(img, dtype=np.uint8)


def _encode_face(image_array: np.ndarray) -> np.ndarray:
    if face_recognition is None:
        raise HTTPException(status_code=500, detail="face_recognition library is not installed")

    locations = face_recognition.face_locations(image_array, number_of_times_to_upsample=2)
    if not locations:
        raise HTTPException(status_code=400, detail="No face detected")
    return face_recognition.face_encodings(image_array, locations)[0]

@router.post("/login", response_model=schemas.Token)
async def login(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),  # "admin" or "student"
    file: Optional[UploadFile] = File(None), # The verification image (optional)
    db: Session = Depends(database.get_db)
):
    # 1. Determine which table to query based on selected role
    if role not in ("admin", "student"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'student'")

    if role == "admin":
        user = db.query(models.Admin).filter(models.Admin.email == email).first()
    else:
        user = db.query(models.Student).filter(models.Student.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # Check if login without face is allowed (dev mode)
    allow_without_face = os.getenv("ALLOW_LOGIN_WITHOUT_FACE", "false").lower() == "true"
    
    file_path = None
    if file:
        # 2. Save Verification Image Locally
        # We rename the file to avoid conflicts (e.g., "admin_123_verify.jpg")
        file_extension = file.filename.split(".")[-1]
        filename = f"verify_{user.id}_{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    # If face verification is allowed to be skipped, allow login without file
    if allow_without_face and not file:
        role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
        access_token = create_access_token({"sub": str(user.id), "role": role_value})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "role": role_value,
            "verification_image_saved_at": None,
        }
    
    # If no profile image, allow login without face verification
    if not user.profile_image:
        role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
        access_token = create_access_token({"sub": str(user.id), "role": role_value})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user.id,
            "role": role_value,
            "verification_image_saved_at": None,
        }

    if not os.path.exists(user.profile_image):
        raise HTTPException(status_code=500, detail="Profile image not found for user")

    profile_array = _load_image(user.profile_image)
    verify_array = _load_image(file_path)
    profile_encoding = _encode_face(profile_array)
    verify_encoding = _encode_face(verify_array)

    distance = face_recognition.face_distance([profile_encoding], verify_encoding)[0]
    threshold = float(os.getenv("FACE_MATCH_THRESHOLD", "0.6"))
    if distance > threshold:
        raise HTTPException(status_code=401, detail="Face verification failed")

    # 3. (Placeholder) This is where we WOULD call the AI Liveness Model
    # liveness_score = check_liveness(file_path)
    # if liveness_score < 0.8: raise HTTPException...

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token({"sub": str(user.id), "role": role_value})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": role_value,
        "verification_image_saved_at": file_path,
    }


@router.get("/me", response_model=schemas.UserOut)
def get_me(
    current_user: models.Admin | models.Student = Depends(get_current_user),
):
    # Return a unified UserOut object that matches both Admin and Student fields
    return schemas.UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        institute_id=current_user.institute_id,
        batch_id=getattr(current_user, 'batch_id', None),
        profile_image=current_user.profile_image,
    )


@router.post("/users/", response_model=schemas.UserOut, status_code=201)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(database.get_db),
    current_user: models.Admin | models.Student = Depends(require_admin),
):
    # Check for existing user in both tables
    existing_admin = db.query(models.Admin).filter(models.Admin.email == user.email).first()
    existing_student = db.query(models.Student).filter(models.Student.email == user.email).first()
    if existing_admin or existing_student:
        raise HTTPException(status_code=409, detail="Email already registered")

    role_value = user.role
    institute_id = user.institute_id
    batch_id = user.batch_id
    current_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if current_role != "super_admin":
        institute_id = current_user.institute_id

    if institute_id is None:
        raise HTTPException(status_code=400, detail="institute_id is required")

    institute = db.query(models.Institute).filter(models.Institute.id == institute_id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute not found")

    normalized_role = role_value.value if hasattr(role_value, "value") else str(role_value)
    inst_short = institute_short_from_model(institute)

    public_id: str
    if normalized_role == "student":
        if batch_id is None:
            raise HTTPException(status_code=400, detail="batch_id is required for student")
        batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.institute_id != institute_id:
            raise HTTPException(status_code=400, detail="Batch does not belong to institute")
        public_id = generate_student_public_id(db, inst_short, batch.public_id)
        
        new_student = models.Student(
            id=public_id,
            institute_id=institute_id,
            batch_id=batch_id,
            email=user.email,
            password_hash=get_password_hash(user.password),
            role=role_value,
            profile_image=user.profile_image,
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        return schemas.UserOut(
            id=new_student.id,
            email=new_student.email,
            role=new_student.role.value if hasattr(new_student.role, "value") else str(new_student.role),
            institute_id=new_student.institute_id,
            batch_id=new_student.batch_id,
            profile_image=new_student.profile_image,
        )
    else:
        role_prefix = "FC" if normalized_role == "proctor" else "US"
        prefix = f"{role_prefix}-{inst_short}-"
        last = (
            db.query(models.Admin)
            .filter(models.Admin.id.like(f"{prefix}%"))
            .order_by(models.Admin.id.desc())
            .first()
        )
        next_num = 1
        if last and last.id and last.id.startswith(prefix):
            suffix = last.id.replace(prefix, "")
            if suffix.isdigit():
                next_num = int(suffix) + 1
        public_id = f"{prefix}{next_num:03d}"

        new_admin = models.Admin(
            id=public_id,
            institute_id=institute_id,
            email=user.email,
            password_hash=get_password_hash(user.password),
            role=role_value,
            profile_image=user.profile_image,
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return schemas.UserOut(
            id=new_admin.id,
            email=new_admin.email,
            role=new_admin.role.value if hasattr(new_admin.role, "value") else str(new_admin.role),
            institute_id=new_admin.institute_id,
            batch_id=None,
            profile_image=new_admin.profile_image,
        )
