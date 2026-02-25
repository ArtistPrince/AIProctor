export type UserRole = 'super_admin' | 'institute_admin' | 'exam_admin' | 'proctor' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institute_id?: string;
  avatar_url?: string;
}

export interface Institute {
  id: string;
  name: string;
  code: string;
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  is_active: boolean;
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
  title: string;
  description: string;
  institute_id: string;
  created_by: string;
  duration_minutes: number;
  total_marks: number;
  proctoring_config: ProctoringConfig;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
  scheduled_at?: string;
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
  name: string;
  institute_id: string;
  student_count: number;
  created_at: string;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_id: string;
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
