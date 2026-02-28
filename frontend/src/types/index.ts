export type UserRole = 'super_admin' | 'institute_admin' | 'exam_admin' | 'proctor' | 'student';

export interface User {
  id: string;
  code?: string;
  name: string;
  email: string;
  role: UserRole;
  institute_id?: string;
  batch_id?: string;
  batch_code?: string;
  batch_year?: string;
  course_name?: string;
  roll_no?: string;
  section?: string;
  avatar_url?: string;
}

export interface Institute {
  id: string;
  institute_code: string;
  name: string;
  address?: string;
  contact_email?: string;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  institute_id: string;
  batch_id: string;
  enrollment_number: string;
  name: string;
  email: string;
  face_registered: boolean;
}

export interface Exam {
  id: string;
  exam_code?: string;
  title: string;
  institute_id: string;
  faculty_id: string;
  subject_code: string;
  exam_type: string;
  exam_year: string;
  duration_minutes: number;
  passing_marks: number;
  scheduled_time?: string;
  created_at: string;
}

export interface ProctoringConfig {
  block_tabs: boolean;
  strict_mode: boolean;
  face_detection: boolean;
  audio_monitoring: boolean;
  screen_recording: boolean;
  periodic_capture: boolean;
  capture_interval_seconds: number;
}

export interface Question {
  id: string;
  exam_id: string;
  type: 'mcq' | 'subjective' | 'coding';
  text: string;
  options?: string[];
  correct_answer?: string;
  marks: number;
  order: number;
}

export interface Batch {
  id: string;
  batch_code?: string;
  name: string;
  institute_id: string;
  course_code: string;
  batch_year: string;
  course_name: string;
  student_count?: number;
  created_at: string;
}

export interface ExamSession {
  id: string;
  session_code?: string;
  exam_id: string;
  exam_code?: string;
  student_id: string;
  student_code?: string;
  status: 'active' | 'submitted' | 'flagged' | 'terminated';
  started_at: string;
  submitted_at?: string;
  trust_score: number;
}

export interface Incident {
  id: string;
  session_id: string;
  type: 'face_not_detected' | 'multiple_faces' | 'tab_switch' | 'audio_anomaly' | 'object_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  snapshot_url?: string;
  description: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, verificationImage?: File | null) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}
