import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Assignment {
  id: string;
  exam_id: string;
  exam: {
    id: string;
    exam_code?: string;
    title: string;
    duration: number;
    scheduled_time?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  };
}

interface SessionDetail {
  id: string;
  exam_id: string;
  exam_code?: string;
  exam_title?: string;
  status: string;
  submitted_at?: string | null;
  attempted_at?: string | null;
}

type ExamStatus = 'attempted' | 'missed' | 'coming_up' | 'live' | 'assigned';

interface ExamListItem {
  examId: string;
  examCode?: string;
  title: string;
  duration: number;
  scheduledTime?: string | null;
  endTime?: string | null;
  status: ExamStatus;
}

export default function StudentExamsPage() {
  const { user, logout } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessionDetails, setSessionDetails] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const [assignmentsRes, sessionsRes] = await Promise.all([
        api.get('/assignments/me'),
        api.get('/sessions/me/details').catch(() => ({ data: [] })),
      ]);
      setAssignments(assignmentsRes.data || []);
      setSessionDetails(sessionsRes.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
      setSessionDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const examsList = useMemo<ExamListItem[]>(() => {
    const latestSessionByExam = new Map<string, SessionDetail>();
    for (const session of sessionDetails) {
      const existing = latestSessionByExam.get(session.exam_id);
      if (!existing) {
        latestSessionByExam.set(session.exam_id, session);
        continue;
      }
      const currentTs = new Date(session.submitted_at || session.attempted_at || 0).getTime();
      const existingTs = new Date(existing.submitted_at || existing.attempted_at || 0).getTime();
      if (currentTs >= existingTs) {
        latestSessionByExam.set(session.exam_id, session);
      }
    }

    const assignmentByExam = new Map<string, Assignment>();
    for (const assignment of assignments) {
      assignmentByExam.set(assignment.exam.id, assignment);
    }

    const allExamIds = new Set<string>([
      ...assignments.map((assignment) => assignment.exam.id),
      ...sessionDetails.map((session) => session.exam_id),
    ]);

    const now = Date.now();
    const items: ExamListItem[] = [];

    allExamIds.forEach((examId) => {
      const assignment = assignmentByExam.get(examId);
      const session = latestSessionByExam.get(examId);
      const scheduledTime = assignment?.exam.scheduled_time || assignment?.exam.start_time || null;
      const endTime = assignment?.exam.end_time || null;

      let status: ExamStatus = 'assigned';
      const normalizedSessionStatus = (session?.status || '').toLowerCase();

      if (normalizedSessionStatus === 'submitted' || normalizedSessionStatus === 'completed') {
        status = 'attempted';
      } else if (normalizedSessionStatus === 'missed') {
        status = 'missed';
      } else if (scheduledTime) {
        const startTs = new Date(scheduledTime).getTime();
        const endTs = endTime ? new Date(endTime).getTime() : null;
        if (now < startTs) {
          status = 'coming_up';
        } else if (endTs && now > endTs) {
          status = 'missed';
        } else {
          status = 'live';
        }
      }

      items.push({
        examId,
        examCode: assignment?.exam.exam_code || session?.exam_code,
        title: assignment?.exam.title || session?.exam_title || 'Exam',
        duration: assignment?.exam.duration || 0,
        scheduledTime,
        endTime,
        status,
      });
    });

    return items.sort((a, b) => {
      const aTs = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Number.MAX_SAFE_INTEGER;
      const bTs = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });
  }, [assignments, sessionDetails]);

  const statusBadgeClass = (status: ExamStatus) => {
    if (status === 'attempted') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'missed') return 'bg-red-100 text-red-800 border-red-200';
    if (status === 'coming_up') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'live') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const statusLabel = (status: ExamStatus) => {
    if (status === 'attempted') return 'Attempted';
    if (status === 'missed') return 'Missed';
    if (status === 'coming_up') return 'Coming Up';
    if (status === 'live') return 'Live';
    return 'Assigned';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-foreground">
              KNOWBOTS <span className="text-primary">LMS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground mr-3">
              <Link to="/student" className="hover:text-primary transition-colors">Dashboard</Link>
              <Link to="/student/exams" className="text-foreground">Exams</Link>
              <Link to="/student/results" className="hover:text-primary transition-colors">Results</Link>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-secondary">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border border-background" />
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name || user?.email || 'Student'}</p>
              <p className="text-xs text-muted-foreground">Student</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px]">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-secondary">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">All Exams</h1>
          <p className="text-muted-foreground mt-1">Track all your exams: attempted, missed, coming up, and live.</p>
        </div>

        {loading ? (
          <Card className="p-6">
            <p className="text-muted-foreground">Loading exams...</p>
          </Card>
        ) : examsList.length === 0 ? (
          <Card className="p-6">
            <p className="text-muted-foreground">No exams found right now.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examsList.map((examItem) => (
              <Card key={examItem.examId} className="border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-foreground text-lg">{examItem.title}</CardTitle>
                    <Badge className={statusBadgeClass(examItem.status)}>{statusLabel(examItem.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground font-mono">{examItem.examCode || '-'}</p>
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> {examItem.duration || '-'} minutes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {examItem.scheduledTime
                      ? `${new Date(examItem.scheduledTime).toLocaleDateString()} ${new Date(examItem.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Schedule not set'}
                  </p>
                  {examItem.status === 'live' ? (
                    <Link
                      to={`/exam/${examItem.examId}/live`}
                      className="block w-full text-center px-4 py-2 rounded-md bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium"
                    >
                      Start Exam
                    </Link>
                  ) : examItem.status === 'coming_up' ? (
                    <button
                      type="button"
                      disabled
                      className="block w-full text-center px-4 py-2 rounded-md bg-secondary text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                      Coming Up
                    </button>
                  ) : (
                    <Link
                      to="/student/results"
                      className="block w-full text-center px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium"
                    >
                      View Results
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
