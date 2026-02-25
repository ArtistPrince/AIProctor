import { StatCard } from '@/components/ui/stat-card';
import { FilePlus, BookOpen, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

interface Exam {
  id: number;
  title: string;
  start_time?: string | null;
}

interface Question {
  id: number;
}

export default function ExamAdminDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [examsRes, questionsRes] = await Promise.all([
        api.get('/exams/').catch(() => ({ data: [] })),
        api.get('/questions/').catch(() => ({ data: [] })),
      ]);
      setExams(examsRes.data || []);
      setQuestions(questionsRes.data || []);
    };
    fetchData();
  }, []);

  const upcomingExams = useMemo(() => {
    return [...exams]
      .filter((exam) => exam.start_time)
      .sort((a, b) => new Date(a.start_time as string).getTime() - new Date(b.start_time as string).getTime())
      .slice(0, 5);
  }, [exams]);
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Exam Administration</p>
        <h1 className="text-2xl font-bold text-foreground">Exam Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Create, schedule, and review examination results</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Exams" value={exams.length} icon={FilePlus} accent="bg-blue-100" />
        <StatCard title="Question Bank" value={questions.length} icon={BookOpen} accent="bg-violet-100" />
        <StatCard title="Scheduled" value={upcomingExams.length} icon={Clock} accent="bg-amber-100" />
      </div>

      <div className="mt-8 bg-card rounded-xl border border-border card-shadow">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Upcoming Examinations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Scheduled and draft exams pending review</p>
        </div>
        <div className="divide-y divide-border">
          {upcomingExams.length === 0 ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">No upcoming exams.</div>
          ) : (
            upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FilePlus className="h-4.5 w-4.5 text-primary" style={{ height: '18px', width: '18px' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{exam.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {exam.start_time ? new Date(exam.start_time).toLocaleString() : 'Unscheduled'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold badge-success">Scheduled</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
