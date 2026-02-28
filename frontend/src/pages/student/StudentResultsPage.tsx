import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, LogOut, User, Trophy } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExamResult {
  id: string;
  session_code?: string;
  exam_id: string;
  exam_code?: string;
  exam_title?: string;
  student_id: string;
  student_code?: string;
  status: string;
  score: number | null;
  attempted_at: string | null;
  submitted_at: string | null;
}

export default function StudentResultsPage() {
  const { user, logout } = useAuthStore();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions/me/details');
      const resultRows = (response.data || []).filter(
        (session: ExamResult) => session.status === 'submitted'
      );
      setResults(resultRows);
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
          <p className="text-muted-foreground mt-1">Review your submitted exam marks.</p>
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
                          <span className="font-bold">{result.exam_title || 'Exam'}</span>
                        </h3>
                        <Badge className="bg-green-100 text-green-800 border-green-200">Submitted</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'Recently'}
                      </p>
                    </div>

                    <div className="text-right">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Marks</p>
                        <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                          {result.score !== null ? `${result.score}%` : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
