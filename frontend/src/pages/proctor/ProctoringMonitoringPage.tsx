import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, AlertTriangle } from 'lucide-react';

interface Exam {
  id: string;
  exam_code?: string;
  title: string;
  duration: number;
  department_id?: string;
  start_time?: string | null;
  end_time?: string | null;
}

interface ExamStats {
  total_attempts: number;
  violations: number;
  avg_integrity: number;
}

export default function ProctoringDashboardPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [examStats, setExamStats] = useState<Record<string, ExamStats>>({});

  const isExamActive = (exam: Exam) => {
    const now = new Date();
    const start = exam.start_time ? new Date(exam.start_time) : null;
    const end = exam.end_time ? new Date(exam.end_time) : null;
    if (!start && !end) return false;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams/');
      setExams(response.data);

      // Fetch stats for each exam
      const stats: Record<string, ExamStats> = {};
      for (const exam of response.data) {
        try {
          const attemptsRes = await api.get(`/sessions/exam/${exam.id}/details`);
          const attempts = attemptsRes.data;
          stats[exam.id] = {
            total_attempts: attempts.length,
            violations: attempts.filter((a: any) => a.violation_logs_id).length,
            avg_integrity:
              attempts.filter((a: any) => a.integrity !== null).length > 0
                ? attempts.reduce((sum: number, a: any) => sum + (a.integrity || 0), 0) /
                  attempts.filter((a: any) => a.integrity !== null).length
                : 0,
          };
        } catch (error) {
          stats[exam.id] = { total_attempts: 0, violations: 0, avg_integrity: 0 };
        }
      }
      setExamStats(stats);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Proctoring</p>
        <h1 className="text-2xl font-bold text-foreground">Exam Monitoring Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of student integrity metrics and violations across exams.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No exams to monitor.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.filter(isExamActive).map((exam) => {
            const stats = examStats[exam.id] || { total_attempts: 0, violations: 0, avg_integrity: 0 };
            const violationPercentage =
              stats.total_attempts > 0 ? ((stats.violations / stats.total_attempts) * 100).toFixed(1) : 0;

            return (
              <Card
                key={exam.id}
                className={`p-6 transition-all ${stats.violations > 0 ? 'border-red-300 bg-red-50/50' : 'hover:shadow-lg'}`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{exam.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{exam.duration} minutes • {exam.exam_code || '-'}</p>
                    </div>
                    {stats.violations > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-secondary rounded-lg">
                      <p className="text-xs text-muted-foreground">Attempts</p>
                      <p className="text-XL font-bold text-foreground">{stats.total_attempts}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stats.violations > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      <p className="text-xs text-muted-foreground">Violations</p>
                      <p className={`text-xl font-bold ${stats.violations > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {stats.violations} {stats.total_attempts > 0 ? `(${violationPercentage}%)` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-muted-foreground">Avg Integrity</p>
                    <p className="text-2xl font-bold text-blue-700">{stats.avg_integrity.toFixed(1)}%</p>
                  </div>

                  <Button
                    onClick={() => navigate(`/proctor/monitoring/${exam.id}`)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Live Grid
                  </Button>
                </div>
              </Card>
            );
          })}
          {exams.filter(isExamActive).length === 0 && (
            <Card className="p-6 text-center md:col-span-2 lg:col-span-3">
              <p className="text-muted-foreground">No active exams right now.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
