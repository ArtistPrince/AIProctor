import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, User, Trophy, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  status: string;
  score: number | null;
  integrity: number | null;
  violation_logs_id: string | null;
  attempted_at: string | null;
  submitted_at: string | null;
}

interface Exam {
  id: string;
  title: string;
}

interface ExamAssignmentWithExam {
  exam_id: string;
  exam: Exam;
}

export default function StudentResultsPage() {
  const { user, logout } = useAuthStore();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [exams, setExams] = useState<Map<string, Exam>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const [sessionsRes, assignmentsRes] = await Promise.all([
        api.get('/sessions/me'),
        api.get('/assignments/me'),
      ]);

      // Filter submitted and missed exams
      const submitted = sessionsRes.data.filter(
        (session: ExamResult) => session.status === 'submitted' || session.status === 'missed'
      );
      setResults(submitted);

      // Use student-allowed assignments endpoint to get exam titles
      const examMap = new Map<string, Exam>();
      assignmentsRes.data.forEach((assignment: ExamAssignmentWithExam) => {
        if (assignment.exam) {
          examMap.set(assignment.exam.id, assignment.exam);
        }
      });
      setExams(examMap);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIntegrityColor = (integrity: number | null) => {
    if (integrity === null) return 'text-muted-foreground';
    if (integrity >= 80) return 'text-green-600';
    if (integrity >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
              <Link to="/student/exams" className="hover:text-primary transition-colors">Exams</Link>
              <Link to="/student/results" className="text-foreground">Results</Link>
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Exam Results</h1>
          <p className="text-muted-foreground mt-1">Review your submitted exam scores and integrity metrics.</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your results...</p>
          </div>
        ) : results.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No submitted exams yet.</p>
            <p className="text-xs text-muted-foreground mt-2">Your completed exams will appear here.</p>
            <Link to="/student">
              <Button className="mt-4 bg-primary hover:opacity-90">Back to Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          <span className="font-bold">{exams.get(result.exam_id)?.title || 'Exam'}</span>
                          <span className="text-muted-foreground font-mono text-sm ml-2">({result.exam_id.slice(0, 8)})</span>
                        </h3>
                        {result.status === 'missed' ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Missed</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-200">Submitted</Badge>
                        )}
                        {result.violation_logs_id && (
                          <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Violations
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'Recently'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Score</p>
                        <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                          {result.score !== null ? `${result.score}%` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Integrity</p>
                        <p className={`text-2xl font-bold ${getIntegrityColor(result.integrity)}`}>
                          {result.integrity !== null ? `${result.integrity}%` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Exams</p>
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
              <p className="text-2xl font-bold text-foreground">
                {(
                  results.filter((r) => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) /
                  results.filter((r) => r.score !== null).length
                ).toFixed(1)}
                %
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Avg Integrity</p>
              <p className="text-2xl font-bold text-foreground">
                {(
                  results.filter((r) => r.integrity !== null).reduce((sum, r) => sum + (r.integrity || 0), 0) /
                  results.filter((r) => r.integrity !== null).length
                ).toFixed(1)}
                %
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Violations</p>
              <p className="text-2xl font-bold text-red-600">{results.filter((r) => r.violation_logs_id).length}</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
