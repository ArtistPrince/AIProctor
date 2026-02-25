import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';

interface ExamAttempt {
  id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  exam_id: string;
  status: string;
  score: number | null;
  integrity: number | null;
}

interface Exam {
  id: string;
  title: string;
  duration: number;
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      // Fetch exam details
      const examRes = await api.get(`/exams/`);
      const foundExam = examRes.data.find((e: Exam) => e.id === examId);
      setExam(foundExam || null);
      
      // Fetch exam attempts
      const response = await api.get(`/sessions/exam/${examId}/details`);
      setAttempts(response.data);
    } catch (error) {
      console.error('Failed to fetch exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      submitted: 'bg-green-100 text-green-800',
      ongoing: 'bg-blue-100 text-blue-800',
      disqualified: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getIntegrityColor = (integrity: number | null) => {
    if (integrity === null) return 'text-muted-foreground';
    if (integrity >= 80) return 'text-green-600';
    if (integrity >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Exam Administration</p>
        <h1 className="text-2xl font-bold text-foreground">
          <span className="font-bold">{exam?.title || 'Exam Results'}</span>
          {exam && <span className="text-muted-foreground font-mono text-sm ml-2">({examId?.slice(0, 8)})</span>}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">View student attempts, scores, and integrity metrics.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading exam attempts...</p>
        </div>
      ) : attempts.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No student attempts yet for this exam.</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Student Name</th>
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Email</th>
                  <th className="text-left py-2 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">Score</th>
                  <th className="text-center py-2 px-4 font-semibold text-foreground">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-4 text-foreground font-medium">{attempt.student_name}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{attempt.student_email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(attempt.status)}`}>
                        {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-foreground font-semibold">
                      {attempt.score !== null ? `${attempt.score}` : '-'}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${getIntegrityColor(attempt.integrity)}`}>
                      {attempt.integrity !== null ? `${attempt.integrity}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Summary Stats */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Attempts</p>
            <p className="text-2xl font-bold text-foreground">{attempts.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Submitted</p>
            <p className="text-2xl font-bold text-green-600">{attempts.filter((a) => a.status === 'submitted').length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
            <p className="text-2xl font-bold text-foreground">
              {(
                attempts.filter((a) => a.score !== null).reduce((sum, a) => sum + (a.score || 0), 0) /
                attempts.filter((a) => a.score !== null).length
              ).toFixed(1)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">High Integrity</p>
            <p className="text-2xl font-bold text-green-600">{attempts.filter((a) => (a.integrity || 0) >= 80).length}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
