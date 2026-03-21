from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class Token(BaseModel):
	access_token: str
	token_type: str
	user_id: str
	role: str
	verification_image_saved_at: Optional[str] = None


class InstituteCreate(BaseModel):
	institute_code: str
	name: str
	address: Optional[str] = None
	contact_email: Optional[str] = None


class InstituteUpdate(BaseModel):
	name: Optional[str] = None
	address: Optional[str] = None
	contact_email: Optional[str] = None


class InstituteAdminPasswordReset(BaseModel):
	new_password: str
	admin_email: Optional[str] = None


class InstituteAdminImportRow(BaseModel):
	name: str
	email: str
	password: str
	emp_id: Optional[str] = None


class InstituteAdminImportRequest(BaseModel):
	admins: List[InstituteAdminImportRow]


class InstituteAdminImportResponse(BaseModel):
	created: int


class FacultyImportRow(BaseModel):
	name: str
	email: str
	dept_code: str
	emp_id: Optional[str] = None


class FacultyImportRequest(BaseModel):
	faculties: List[FacultyImportRow]


class FacultyImportResponse(BaseModel):
	created: int


class BatchImportRow(BaseModel):
	course_name: str
	course_code: str
	batch_year: str


class BatchImportRequest(BaseModel):
	batches: List[BatchImportRow]


class BatchImportResponse(BaseModel):
	created: int


class StudentImportRow(BaseModel):
	name: str
	email: str
	batch_code: Optional[str] = None
	batch_id: Optional[str] = None
	section: str
	roll_no: str
	password: Optional[str] = None


class StudentImportRequest(BaseModel):
	students: List[StudentImportRow]


class StudentImportResponse(BaseModel):
	created: int


class InstituteOut(BaseModel):
	id: str
	institute_code: str
	name: str
	address: Optional[str] = None
	contact_email: Optional[str] = None
	created_at: Optional[datetime] = None

	class Config:
		from_attributes = True


class UserOut(BaseModel):
	id: str
	institute_id: Optional[str] = None
	batch_id: Optional[str] = None
	batch_code: Optional[str] = None
	batch_year: Optional[str] = None
	course_name: Optional[str] = None
	name: Optional[str] = None
	email: str
	role: str
	profile_image: Optional[str] = None
	code: Optional[str] = None
	roll_no: Optional[str] = None
	section: Optional[str] = None

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
	name: str
	email: str
	password: str
	role: str
	emp_id: Optional[str] = None
	dept_code: Optional[str] = None
	section: Optional[str] = None
	roll_no: Optional[str] = None


class StudentUpdate(BaseModel):
	name: Optional[str] = None
	email: Optional[str] = None
	batch_id: Optional[str] = None
	section: Optional[str] = None
	roll_no: Optional[str] = None


class FacultyCreate(BaseModel):
	institute_id: str
	name: str
	dept_code: str
	emp_id: str
	email: str


class FacultyUpdate(BaseModel):
	name: Optional[str] = None
	dept_code: Optional[str] = None
	email: Optional[str] = None


class FacultyOut(BaseModel):
	id: str
	institute_id: str
	name: str
	dept_code: str
	emp_id: str
	faculty_code: Optional[str] = None
	email: str

	class Config:
		from_attributes = True


class DepartmentOut(BaseModel):
	id: str
	institute_id: str
	name: str
	code: str

	class Config:
		from_attributes = True


class ExamCreate(BaseModel):
	faculty_id: Optional[str] = None
	subject_code: str
	exam_type: str
	exam_year: str
	title: str
	duration_minutes: int = Field(alias="duration")
	passing_marks: int
	scheduled_time: Optional[datetime] = None
	end_time: Optional[datetime] = None

	class Config:
		populate_by_name = True


class ExamUpdate(BaseModel):
	title: Optional[str] = None
	duration_minutes: Optional[int] = Field(default=None, alias="duration")
	passing_marks: Optional[int] = None
	scheduled_time: Optional[datetime] = None
	end_time: Optional[datetime] = None

	class Config:
		populate_by_name = True


class ExamOut(BaseModel):
	id: str
	institute_id: str
	faculty_id: str
	subject_code: str
	exam_type: str
	exam_year: str
	exam_code: Optional[str] = None
	title: str
	duration_minutes: int
	passing_marks: int
	scheduled_time: Optional[datetime] = None
	end_time: Optional[datetime] = None
	created_at: Optional[datetime] = None
	duration: int

	class Config:
		from_attributes = True


class QuestionCreate(BaseModel):
	exam_id: str
	type: Optional[str] = "MCQ"
	text: str
	marks: int = 1
	data: Dict[str, Any] = {}


class QuestionOut(BaseModel):
	id: UUID | str
	institute_id: Optional[str] = None
	exam_id: str
	type: str
	text: str
	marks: int
	data: Dict[str, Any]

	class Config:
		from_attributes = True


class BatchCreate(BaseModel):
	institute_id: Optional[str] = None
	course_code: str
	batch_year: str
	course_name: str
	members: List[str] = []


class BatchOut(BaseModel):
	id: str
	institute_id: str
	course_code: str
	batch_year: str
	batch_code: Optional[str] = None
	course_name: str
	name: str
	members: List[str]
	created_at: Optional[datetime] = None

	class Config:
		from_attributes = True


class ExamAssignmentCreate(BaseModel):
	exam_id: str
	batch_id: str


class ExamAssignmentOut(BaseModel):
	id: UUID | str
	institute_id: Optional[str] = None
	exam_id: str
	exam_code: Optional[str] = None
	batch_id: str
	batch_code: Optional[str] = None
	student_id: Optional[str] = None
	student_code: Optional[str] = None
	assigned_at: Optional[datetime] = None

	class Config:
		from_attributes = True


class ExamAssignmentWithExam(BaseModel):
	id: UUID | str
	exam_id: str
	batch_id: Optional[str] = None
	batch_code: Optional[str] = None
	student_id: Optional[str] = None
	student_code: Optional[str] = None
	exam: ExamOut

	class Config:
		from_attributes = True


class ExamSessionCreate(BaseModel):
	student_id: str
	exam_id: str
	score: Optional[int] = None
	integrity: Optional[int] = None
	status: Optional[str] = "completed"


class ExamSessionReleaseUpdate(BaseModel):
	released: bool


class ExamSessionOut(BaseModel):
	id: str
	session_code: Optional[str] = None
	institute_id: Optional[str] = None
	student_id: str
	student_code: Optional[str] = None
	exam_id: str
	exam_code: Optional[str] = None
	status: str
	score: Optional[int] = None
	integrity: Optional[int] = None
	started_at: Optional[datetime] = None
	completed_at: Optional[datetime] = None
	violation_found: Optional[bool] = False
	mongo_log_ref: Optional[str] = None
	s3_media_prefix: Optional[str] = None

	class Config:
		from_attributes = True


class StudentInfo(BaseModel):
	id: str
	code: Optional[str] = None
	email: str
	profile_image: Optional[str] = None

	class Config:
		from_attributes = True


class ExamSessionWithDetails(BaseModel):
	id: str
	session_code: Optional[str] = None
	student_id: str
	student_code: Optional[str] = None
	student: StudentInfo
	exam_id: str
	exam_code: Optional[str] = None
	status: str
	score: Optional[int] = None
	integrity: Optional[int] = None
	violation_logs_id: Optional[str] = None
	attempted_at: Optional[datetime] = None
	submitted_at: Optional[datetime] = None

	class Config:
		from_attributes = True
