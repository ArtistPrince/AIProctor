import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  duration: number;
  department_id?: string;
  start_time?: string;
  end_time?: string;
}

export default function ExamAttemptsDashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams/');
      setExams(response.data);

      // Fetch attempt counts for each exam
      const counts: Record<string, number> = {};
      for (const exam of response.data) {
        try {
          const attemptsRes = await api.get(`/sessions/exam/${exam.id}/details`);
          counts[exam.id] = attemptsRes.data.length;
        } catch (error) {
          counts[exam.id] = 0;
        }
      }
      setAttemptCounts(counts);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Results</p>
        <h1 className="text-2xl font-bold text-foreground">Exam Attempts</h1>
        <p className="text-sm text-muted-foreground mt-1">View and analyze student exam attempts across all exams.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading exams...</p>
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">No exams created yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => (
            <Card key={exam.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{exam.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{exam.duration} minutes</p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Student Attempts</p>
                    <p className="text-lg font-bold text-foreground">{attemptCounts[exam.id] || 0}</p>
                  </div>
                </div>

                <Button
                  onClick={() => navigate(`/exam-admin/results/${exam.id}`)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
