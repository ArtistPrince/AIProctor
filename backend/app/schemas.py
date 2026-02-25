from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel


class Token(BaseModel):
	access_token: str
	token_type: str
	user_id: str
	role: str
	verification_image_saved_at: Optional[str] = None


class InstituteCreate(BaseModel):
	name: str
	plan: str = "Free"
	config: Dict[str, Any] = {}


class InstituteOut(BaseModel):
	id: str
	name: str
	plan: str
	config: Dict[str, Any]

	class Config:
		from_attributes = True


class UserOut(BaseModel):
	id: str
	institute_id: Optional[str] = None
	batch_id: Optional[str] = None
	email: str
	role: str
	profile_image: Optional[str] = None

	class Config:
		from_attributes = True


class AdminOut(BaseModel):
	id: str
	institute_id: Optional[str] = None
	email: str
	role: str
	profile_image: Optional[str] = None

	class Config:
		from_attributes = True


class StudentOut(BaseModel):
	id: str
	institute_id: str
	batch_id: str
	email: str
	role: str
	profile_image: Optional[str] = None

	class Config:
		from_attributes = True


class UserCreate(BaseModel):
	institute_id: Optional[str] = None
	batch_id: Optional[str] = None
	email: str
	password: str
	role: str
	profile_image: Optional[str] = None


class DepartmentCreate(BaseModel):
	institute_id: str
	name: str
	code: Optional[str] = None


class DepartmentOut(BaseModel):
	id: str
	institute_id: str
	name: str
	code: str

	class Config:
		from_attributes = True


class ExamCreate(BaseModel):
	department_id: str
	title: str
	duration: int
	start_time: Optional[datetime] = None
	end_time: Optional[datetime] = None
	proctor_config: Dict[str, Any] = {}
	random_rules: Dict[str, Any] = {}


class ExamOut(BaseModel):
	id: str
	institute_id: Optional[str] = None
	department_id: Optional[str] = None
	title: str
	duration: int
	start_time: Optional[datetime] = None
	end_time: Optional[datetime] = None
	proctor_config: Dict[str, Any]
	random_rules: Dict[str, Any]

	class Config:
		from_attributes = True


class QuestionCreate(BaseModel):
	exam_id: str
	type: str
	text: str
	marks: int = 1
	data: Dict[str, Any] = {}


class QuestionOut(BaseModel):
	id: UUID | str
	exam_id: str
	type: str
	text: str
	marks: int
	data: Dict[str, Any]

	class Config:
		from_attributes = True


class BatchCreate(BaseModel):
	department_id: str
	batch_year: int
	name: str
	members: List[str] = []


class BatchOut(BaseModel):
	id: str
	institute_id: Optional[str] = None
	department_id: Optional[str] = None
	batch_year: int
	name: str
	members: List[str]

	class Config:
		from_attributes = True


class ExamAssignmentCreate(BaseModel):
	exam_id: str
	batch_id: Optional[str] = None
	student_id: Optional[str] = None


class ExamAssignmentOut(BaseModel):
	id: UUID | str
	exam_id: str
	batch_id: Optional[str] = None
	student_id: Optional[str] = None

	class Config:
		from_attributes = True


class ExamAssignmentWithExam(BaseModel):
	id: UUID | str
	exam_id: str
	batch_id: Optional[str] = None
	student_id: Optional[str] = None
	exam: ExamOut

	class Config:
		from_attributes = True


class ExamSessionCreate(BaseModel):
	student_id: str
	exam_id: str
	score: Optional[int] = None
	integrity: Optional[int] = None
	status: Optional[str] = "submitted"


class ExamSessionOut(BaseModel):
	id: str
	student_id: str
	exam_id: str
	status: str
	score: Optional[int] = None
	integrity: Optional[int] = None

	class Config:
		from_attributes = True


class StudentInfo(BaseModel):
	id: str
	email: str
	profile_image: Optional[str] = None

	class Config:
		from_attributes = True


class ExamSessionWithDetails(BaseModel):
	id: str
	student_id: str
	student: StudentInfo
	exam_id: str
	status: str
	score: Optional[int] = None
	integrity: Optional[int] = None
	violation_logs_id: Optional[str] = None
	attempted_at: Optional[datetime] = None
	submitted_at: Optional[datetime] = None

	class Config:
		from_attributes = True
