from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final

from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models

NON_ALNUM: Final[re.Pattern[str]] = re.compile(r"[^A-Za-z0-9]+")


@dataclass(frozen=True)
class KeyParts:
    institute_short: str
    department_code: str
    batch_key: str


def _sanitize_alnum_upper(value: str) -> str:
    cleaned = NON_ALNUM.sub("", value or "").upper()
    return cleaned


def institute_short_from_name(name: str) -> str:
    words = [w for w in re.split(r"\s+", name.strip()) if w]
    if len(words) >= 2:
        token = "".join(part[0] for part in words[:4])
    else:
        token = _sanitize_alnum_upper(name)[:4]
    token = (token or "INST")[:4]
    return token.ljust(4, "X")


def department_code_from_name(name: str) -> str:
    code = _sanitize_alnum_upper(name)[:3]
    return (code or "DPT").ljust(3, "X")


def institute_short_from_model(institute: models.Institute) -> str:
    if institute.id and "-" in institute.id:
        return institute.id.split("-", 1)[0]
    return institute_short_from_name(institute.name)


def batch_year_2digit(batch_year: int) -> str:
    if batch_year < 0:
        raise ValueError("batch_year must be a positive year")
    return f"{batch_year % 100:02d}"


def _next_numeric_suffix(
    db: Session,
    *,
    model: type,
    prefix: str,
    width: int,
    start: int,
) -> int:
    pattern = f"{prefix}%"
    max_value = (
        db.query(func.max(func.right(model.id, width)))
        .filter(model.id.like(pattern))
        .scalar()
    )
    if not max_value:
        return start
    try:
        return int(max_value) + 1
    except ValueError:
        return start


def generate_institute_public_id(db: Session, institute_name: str) -> str:
    inst_short = institute_short_from_name(institute_name)
    prefix = f"{inst_short}-"
    next_num = _next_numeric_suffix(db, model=models.Institute, prefix=prefix, width=4, start=1001)
    return f"{prefix}{next_num:04d}"


def generate_department_public_id(db: Session, institute_short: str, department_code: str) -> str:
    prefix = f"{institute_short}-{department_code}-"
    next_num = _next_numeric_suffix(db, model=models.Department, prefix=prefix, width=3, start=1)
    return f"{prefix}{next_num:03d}"


def build_batch_key(department_code: str, batch_year: int, serial: int) -> str:
    year = batch_year_2digit(batch_year)
    return f"{department_code}-{year}-{serial:02d}"


def generate_batch_public_id(db: Session, department_code: str, batch_year: int) -> str:
    year = batch_year_2digit(batch_year)
    prefix = f"{department_code}-{year}-"
    next_num = _next_numeric_suffix(db, model=models.Batch, prefix=prefix, width=2, start=1)
    return f"{prefix}{next_num:02d}"


def generate_student_public_id(db: Session, institute_short: str, batch_public_id: str) -> str:
    prefix = f"{institute_short}-{batch_public_id}-"
    next_num = _next_numeric_suffix(db, model=models.Student, prefix=prefix, width=3, start=1)
    return f"{prefix}{next_num:03d}"


def generate_exam_public_id(db: Session, institute_short: str, department_code: str) -> str:
    prefix = f"{institute_short}-{department_code}-EX"
    next_num = _next_numeric_suffix(db, model=models.Exam, prefix=prefix, width=3, start=1)
    return f"{prefix}{next_num:03d}"


def generate_session_public_id(db: Session, student_public_id: str, exam_public_id: str) -> str:
    exam_code = exam_public_id.split("-")[-1] if exam_public_id else "EX000"
    prefix = f"{student_public_id}-{exam_code}"
    candidate = prefix
    idx = 1
    while db.query(models.ExamSession).filter(models.ExamSession.id == candidate).first() is not None:
        candidate = f"{prefix}-{idx:02d}"
        idx += 1
    return candidate
