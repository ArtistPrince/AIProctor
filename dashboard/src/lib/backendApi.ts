import { Batch, Exam, ExamResult, Faculty, Institute, ProctoringSession, Question, User, UserRole } from '@/types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';
const ACCESS_TOKEN_KEY = 'proctorx_access_token';

type LoginRole = 'admin' | 'student';

interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
}

interface BackendUser {
  id: string;
  institute_id?: string | null;
  batch_id?: string | null;
  batch_code?: string | null;
  batch_year?: string | null;
  course_name?: string | null;
  name?: string | null;
  email: string;
  role: string;
  code?: string | null;
  roll_no?: string | null;
}

interface BackendInstitute {
  id: string;
  institute_code: string;
  name: string;
  address?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
}

interface BackendFaculty {
  id: string;
  institute_id: string;
  name: string;
  dept_code: string;
  emp_id: string;
  email: string;
}

interface BackendBatch {
  id: string;
  institute_id: string;
  course_code: string;
  batch_year: string;
  batch_code?: string | null;
  course_name: string;
  name: string;
  members: string[];
}

interface BackendExam {
  id: string;
  institute_id: string;
  faculty_id: string;
  subject_code: string;
  exam_type: string;
  exam_year: string;
  exam_code?: string | null;
  title: string;
  duration_minutes: number;
  passing_marks: number;
  scheduled_time?: string | null;
  end_time?: string | null;
}

interface BackendSession {
  id: string;
  institute_id?: string | null;
  student_id: string;
  student_code?: string | null;
  student_name?: string | null;
  exam_id: string;
  exam_code?: string | null;
  exam_title?: string | null;
  score?: number | null;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  violation_found?: boolean;
  mongo_log_ref?: string | null;
  violation_logs_id?: string | null;
}

interface BackendAssignment {
  id: string;
  institute_id?: string | null;
  exam_id: string;
  batch_id: string;
}

interface BackendQuestion {
  id: string;
  exam_id: string;
  type?: string;
  text: string;
  marks: number;
  data?: {
    options?: string[];
    correct_answer?: string;
  };
}

function normalizeBackendRole(role: string): UserRole {
  if (role === 'super_admin') return 'super_admin';
  if (role === 'institute_admin') return 'institute_admin';
  if (role === 'student') return 'student';
  return 'faculty';
}

function computeExamStatus(scheduledAt?: string | null, endAt?: string | null): Exam['status'] {
  if (!scheduledAt) return 'draft';
  const now = Date.now();
  const start = new Date(scheduledAt).getTime();
  const end = endAt ? new Date(endAt).getTime() : Number.NaN;
  if (!Number.isNaN(end) && now > end) return 'completed';
  if (now >= start && (Number.isNaN(end) || now <= end)) return 'live';
  return 'scheduled';
}

function mapUser(payload: BackendUser): User {
  return {
    id: payload.id,
    name: payload.name || payload.email,
    email: payload.email,
    role: normalizeBackendRole(payload.role),
    instituteId: payload.institute_id || undefined,
  };
}

function mapInstitute(row: BackendInstitute): Institute {
  return {
    id: row.id,
    name: row.name,
    email: row.contact_email || '',
    phone: row.address || '',
    adminName: '',
    adminEmail: '',
    status: 'active',
    totalBatches: 0,
    totalStudents: 0,
    totalFaculties: 0,
    totalExams: 0,
    riskScore: 0,
    createdAt: row.created_at ? row.created_at.split('T')[0] : '',
  };
}

function mapFaculty(row: BackendFaculty): Faculty {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    department: row.dept_code,
    designation: 'Faculty',
    batchIds: [],
    status: 'active',
  };
}

function mapBatch(row: BackendBatch): Batch {
  return {
    id: row.id,
    name: row.batch_code || row.name,
    department: row.course_code,
    year: row.batch_year,
    totalStudents: row.members.length,
    totalExams: 0,
    avgScore: 0,
    riskSummary: 'low',
  };
}

function mapExam(row: BackendExam): Exam {
  return {
    id: row.id,
    title: row.title,
    description: `${row.subject_code} · ${row.exam_type}`,
    duration: row.duration_minutes,
    totalMarks: row.passing_marks,
    mode: 'online',
    status: computeExamStatus(row.scheduled_time, row.end_time),
    batches: [],
    proctors: [row.faculty_id],
    startDate: row.scheduled_time || '',
    endDate: row.end_time || '',
    createdBy: row.faculty_id,
    totalQuestions: 0,
  };
}

function mapSessionToResult(row: BackendSession, examById: Record<string, Exam>): ExamResult {
  const exam = examById[row.exam_id];
  const totalMarks = exam?.totalMarks || 100;
  const score = row.score ?? 0;
  return {
    studentId: row.student_id,
    studentName: row.student_name || row.student_code || 'Student',
    examId: row.exam_id,
    examTitle: row.exam_title || exam?.title || row.exam_code || 'Exam',
    score,
    totalMarks,
    percentage: totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0,
    violations: row.violation_logs_id ? 1 : 0,
    released: row.status === 'submitted' || row.status === 'completed',
  };
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function loginRequest(email: string, password: string, role: LoginRole): Promise<TokenResponse> {
  const body = new FormData();
  body.append('email', email);
  body.append('password', password);
  body.append('role', role);
  return apiRequest<TokenResponse>('/login', { method: 'POST', body });
}

export async function getMe(): Promise<User> {
  const me = await apiRequest<BackendUser>('/me');
  return mapUser(me);
}

export async function listInstitutes(): Promise<Institute[]> {
  const [rows, users, faculties, batches, exams, sessions] = await Promise.all([
    apiRequest<BackendInstitute[]>('/institutes/'),
    listUsers().catch(() => []),
    apiRequest<BackendFaculty[]>('/faculties/').catch(() => []),
    apiRequest<BackendBatch[]>('/batches/').catch(() => []),
    apiRequest<BackendExam[]>('/exams/').catch(() => []),
    apiRequest<BackendSession[]>('/sessions/').catch(() => []),
  ]);

  return rows.map((row) => {
    const instituteBatches = batches.filter((batch) => batch.institute_id === row.id);
    const instituteUsers = users.filter((user) => user.institute_id === row.id);
    const instituteFaculties = faculties.filter((faculty) => faculty.institute_id === row.id);
    const instituteExams = exams.filter((exam) => exam.institute_id === row.id);
    const instituteSessions = sessions.filter((session) => session.institute_id === row.id);
    const violations = instituteSessions.filter((session) => session.violation_found).length;
    const riskScore = instituteSessions.length ? Math.round((violations / instituteSessions.length) * 100) : 0;

    return {
      ...mapInstitute(row),
      totalBatches: instituteBatches.length,
      totalStudents: instituteUsers.filter((user) => user.role === 'student').length,
      totalFaculties: instituteFaculties.length,
      totalExams: instituteExams.length,
      riskScore,
    };
  });
}

export async function createInstitute(payload: {
  instituteCode: string;
  name: string;
  address?: string;
  contactEmail?: string;
}): Promise<Institute> {
  const row = await apiRequest<BackendInstitute>('/institutes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institute_code: payload.instituteCode,
      name: payload.name,
      address: payload.address || null,
      contact_email: payload.contactEmail || null,
    }),
  });
  return mapInstitute(row);
}

export async function createUser(payload: {
  instituteId?: string;
  batchId?: string;
  name: string;
  email: string;
  password: string;
  role: 'institute_admin' | 'exam_admin' | 'student';
  empId?: string;
  deptCode?: string;
  section?: string;
  rollNo?: string;
}): Promise<void> {
  await apiRequest('/users/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institute_id: payload.instituteId,
      batch_id: payload.batchId,
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      emp_id: payload.empId,
      dept_code: payload.deptCode,
      section: payload.section,
      roll_no: payload.rollNo,
    }),
  });
}

export async function listUsers(): Promise<BackendUser[]> {
  return apiRequest<BackendUser[]>('/users/');
}

export async function listFaculties(): Promise<Faculty[]> {
  const rows = await apiRequest<BackendFaculty[]>('/faculties/');
  return rows.map(mapFaculty);
}

export async function createFaculty(payload: {
  instituteId: string;
  name: string;
  email: string;
  deptCode: string;
  empId: string;
}): Promise<Faculty> {
  const row = await apiRequest<BackendFaculty>('/faculties/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institute_id: payload.instituteId,
      name: payload.name,
      email: payload.email,
      dept_code: payload.deptCode,
      emp_id: payload.empId,
    }),
  });
  return mapFaculty(row);
}

export async function listBatches(): Promise<Batch[]> {
  const [rows, assignments, sessions, users] = await Promise.all([
    apiRequest<BackendBatch[]>('/batches/'),
    apiRequest<BackendAssignment[]>('/assignments/').catch(() => []),
    apiRequest<BackendSession[]>('/sessions/').catch(() => []),
    listUsers().catch(() => []),
  ]);

  const studentBatchById = users.reduce<Record<string, string>>((acc, user) => {
    if (user.role === 'student' && user.batch_id) {
      acc[user.id] = user.batch_id;
    }
    return acc;
  }, {});

  return rows.map((row) => {
    const mapped = mapBatch(row);
    const assignedExams = new Set(assignments.filter((item) => item.batch_id === row.id).map((item) => item.exam_id));
    const batchSessions = sessions.filter((session) => studentBatchById[session.student_id] === row.id);
    const scored = batchSessions.filter((session) => typeof session.score === 'number');
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, session) => sum + (session.score || 0), 0) / scored.length)
      : 0;
    const violationRate = batchSessions.length
      ? (batchSessions.filter((session) => session.violation_found).length / batchSessions.length) * 100
      : 0;
    const riskSummary: Batch['riskSummary'] = violationRate > 20 ? 'high' : violationRate > 8 ? 'medium' : 'low';

    return {
      ...mapped,
      totalExams: assignedExams.size,
      avgScore,
      riskSummary,
    };
  });
}

export async function createBatch(payload: {
  instituteId?: string;
  courseCode: string;
  batchYear: string;
  courseName: string;
}): Promise<Batch> {
  const row = await apiRequest<BackendBatch>('/batches/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      institute_id: payload.instituteId,
      course_code: payload.courseCode,
      batch_year: payload.batchYear,
      course_name: payload.courseName,
      members: [],
    }),
  });
  return mapBatch(row);
}

export async function listExams(): Promise<Exam[]> {
  const rows = await apiRequest<BackendExam[]>('/exams/');
  return rows.map(mapExam);
}

export async function listExamsWithActivity(): Promise<Exam[]> {
  const rows = await apiRequest<BackendExam[]>('/exams/');
  const activeExamIds = await apiRequest<BackendSession[]>('/sessions/')
    .then((sessions) => new Set(sessions.filter((session) => session.status === 'in_progress').map((session) => session.exam_id)))
    .catch(() => new Set<string>());

  return rows.map((row) => {
    const exam = mapExam(row);
    if (activeExamIds.has(exam.id)) {
      return { ...exam, status: 'live' };
    }
    return exam;
  });
}

export async function listMyAssignments(): Promise<Exam[]> {
  const rows = await apiRequest<Array<{ exam: BackendExam }>>('/assignments/me');
  return rows.map((row) => mapExam(row.exam));
}

export async function listMySessions(): Promise<BackendSession[]> {
  return apiRequest<BackendSession[]>('/sessions/me/details');
}

export async function createExam(payload: {
  title: string;
  subjectCode: string;
  examType: string;
  examYear: string;
  duration: number;
  passingMarks: number;
  scheduledTime?: string;
  endTime?: string;
}): Promise<Exam> {
  const row = await apiRequest<BackendExam>('/exams/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: payload.title,
      subject_code: payload.subjectCode,
      exam_type: payload.examType,
      exam_year: payload.examYear,
      duration: payload.duration,
      passing_marks: payload.passingMarks,
      scheduled_time: payload.scheduledTime || null,
      end_time: payload.endTime || null,
    }),
  });
  return mapExam(row);
}

export async function createQuestion(payload: {
  examId: string;
  text: string;
  marks: number;
  options: string[];
  correctAnswer: string;
}): Promise<void> {
  await apiRequest('/questions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exam_id: payload.examId,
      text: payload.text,
      marks: payload.marks,
      data: {
        options: payload.options,
        correct_answer: payload.correctAnswer,
      },
    }),
  });
}

export async function listQuestionsForExam(examId: string): Promise<Question[]> {
  const rows = await apiRequest<BackendQuestion[]>(`/questions/exam/${examId}`);
  return rows.map((row) => ({
    id: row.id,
    type: row.type?.toLowerCase() === 'short_answer' ? 'short_answer' : 'mcq',
    text: row.text,
    options: row.data?.options || [],
    correctAnswer: row.data?.correct_answer || '',
    marks: row.marks,
  }));
}

export async function createAssignment(examId: string, batchId: string): Promise<void> {
  await apiRequest('/assignments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exam_id: examId, batch_id: batchId }),
  });
}

export async function listFacultyResults(): Promise<ExamResult[]> {
  const [sessions, exams] = await Promise.all([
    apiRequest<BackendSession[]>('/sessions/'),
    listExams(),
  ]);
  const examById = exams.reduce<Record<string, Exam>>((acc, exam) => {
    acc[exam.id] = exam;
    return acc;
  }, {});
  return sessions.map((row) => mapSessionToResult(row, examById));
}

export async function listStudentResults(): Promise<ExamResult[]> {
  const rows = await apiRequest<BackendSession[]>('/sessions/me/details');
  const exams = await listMyAssignments().catch(() => []);
  const examById = exams.reduce<Record<string, Exam>>((acc, exam) => {
    acc[exam.id] = exam;
    return acc;
  }, {});
  return rows.map((row) => mapSessionToResult(row, examById));
}

export async function listSessions(): Promise<BackendSession[]> {
  return apiRequest<BackendSession[]>('/sessions/');
}

export async function listProctoringSessions(): Promise<ProctoringSession[]> {
  const [sessions, users] = await Promise.all([listSessions(), listUsers()]);
  const userById = users.reduce<Record<string, string>>((acc, user) => {
    if (user.role === 'student') {
      acc[user.id] = user.name || user.email;
    }
    return acc;
  }, {});

  return sessions.map((session) => {
    const hasViolation = !!(session.violation_found || session.violation_logs_id || session.mongo_log_ref);
    const status = session.status === 'terminated' ? 'warning' : 'connected';
    const riskLevel = hasViolation ? 'high' : session.status === 'in_progress' ? 'medium' : 'low';
    return {
      studentId: session.student_id,
      studentName: userById[session.student_id] || session.student_code || 'Student',
      status,
      riskLevel,
      faceDetected: !hasViolation,
      networkStrength: session.status === 'in_progress' ? 'strong' : 'moderate',
      progress: session.status === 'completed' ? 100 : session.status === 'in_progress' ? 60 : 0,
      violations: hasViolation
        ? [
            {
              id: session.id,
              type: 'Integrity Alert',
              timestamp: new Date(session.completed_at || session.started_at || Date.now()).toLocaleTimeString(),
              severity: 'high',
              description: 'Potential exam integrity issue detected for this session.',
            },
          ]
        : [],
    };
  });
}
