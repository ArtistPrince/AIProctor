import os
from datetime import datetime, timedelta
from typing import Optional, List, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .database import get_db
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")


def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not set")
    return secret


def _get_access_token_expiry_minutes() -> int:
    raw = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    try:
        return int(raw)
    except ValueError:
        return 60


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=_get_access_token_expiry_minutes()))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _get_jwt_secret(), algorithm=os.getenv("JWT_ALGORITHM", "HS256"))


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.Admin | models.Student:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[os.getenv("JWT_ALGORITHM", "HS256")])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Try to find user in admins table first, then students
    user = db.query(models.Admin).filter(models.Admin.id == user_id).first()
    if not user:
        user = db.query(models.Student).filter(models.Student.id == user_id).first()
    
    if user is None:
        raise credentials_exception
    return user


def require_role(roles: List[str]) -> Callable:
    def _role_guard(current_user: models.Admin | models.Student = Depends(get_current_user)) -> models.Admin | models.Student:
        role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        if role_value not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return _role_guard
