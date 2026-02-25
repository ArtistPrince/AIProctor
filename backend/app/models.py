import enum
from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB

from .database import Base


def _enum_values(enum_cls):
    return [member.value for member in enum_cls]


class UserRole(str, enum.Enum):
    STUDENT = "student"
    PROCTOR = "proctor"
    EXAM_ADMIN = "exam_admin"
    INSTITUTE_ADMIN = "institute_admin"
    SUPER_ADMIN = "super_admin"


class QuestionType(str, enum.Enum):
    MCQ = "MCQ"
    CODING = "Coding"
    DESCRIPTIVE = "Descriptive"


class SessionStatus(str, enum.Enum):
    ONGOING = "ongoing"
    SUBMITTED = "submitted"
    DISQUALIFIED = "disqualified"
    MISSED = "missed"


class Institute(Base):
    __tablename__ = "institutes"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    plan = Column(String, default="Free")
    config = Column(JSONB, default=dict)


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("institute_id", "name", name="uq_department_institute_name"),
        UniqueConstraint("institute_id", "code", name="uq_department_institute_code"),
    )

    id = Column(String, primary_key=True, index=True)
    institute_id = Column(String, ForeignKey("institutes.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String(3), nullable=False)


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String, primary_key=True, index=True)
    institute_id = Column(String, ForeignKey("institutes.id"), index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role", values_callable=_enum_values), nullable=False)
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True)
    institute_id = Column(String, ForeignKey("institutes.id"), index=True, nullable=False)
    batch_id = Column(String, ForeignKey("batches.id"), index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole, name="user_role", values_callable=_enum_values), nullable=False)
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String, primary_key=True, index=True)
    institute_id = Column(String, ForeignKey("institutes.id"), index=True, nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), index=True, nullable=False)
    batch_year = Column(Integer, nullable=False)
    name = Column(String)
    members = Column(JSONB, default=list)


class Exam(Base):
    __tablename__ = "exams"

    id = Column(String, primary_key=True, index=True)
    institute_id = Column(String, ForeignKey("institutes.id"), index=True, nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), index=True, nullable=False)
    title = Column(String)
    duration = Column(Integer)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    proctor_config = Column(JSONB, default=dict)
    random_rules = Column(JSONB, default=dict)


class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"))
    type = Column(Enum(QuestionType, name="question_type", values_callable=_enum_values), nullable=False)
    text = Column(String)
    marks = Column(Integer, default=1)
    data = Column(JSONB, default=dict)


class ExamAssignment(Base):
    __tablename__ = "exam_assignments"

    id = Column(String, primary_key=True, index=True)
    exam_id = Column(String, ForeignKey("exams.id"))
    batch_id = Column(String, ForeignKey("batches.id"), nullable=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "(batch_id IS NOT NULL AND student_id IS NULL) OR (batch_id IS NULL AND student_id IS NOT NULL)",
            name="chk_assignment_target",
        ),
    )


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id = Column(String, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"))
    exam_id = Column(String, ForeignKey("exams.id"))
    status = Column(
        Enum(SessionStatus, name="session_status", values_callable=_enum_values),
        default=SessionStatus.ONGOING,
    )
    score = Column(Integer, nullable=True)
    integrity = Column(Integer, nullable=True)