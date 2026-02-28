import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Exam {
  id: string;
  exam_code?: string;
  title: string;
  duration: number;
  proctor_config: { level?: string };
}

interface Batch {
  id: string;
  batch_code?: string;
  name: string;
  members: string[];
}

interface Assignment {
  id: string;
  exam_id: string;
  exam_code?: string;
  batch_id?: string | null;
  batch_code?: string | null;
  student_id?: string | null;
  student_code?: string | null;
}

export default function AssignExamPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [assignmentExamId, setAssignmentExamId] = useState<string>('');
  const [assignmentBatchId, setAssignmentBatchId] = useState<string>('');

  useEffect(() => {
    fetchExams();
    fetchBatches();
    fetchAssignments();
  }, []);

  const fetchExams = async () => {
    const response = await api.get('/exams/');
    setExams(response.data);
  };

  const fetchBatches = async () => {
    const response = await api.get('/batches/');
    setBatches(response.data);
  };

  const fetchAssignments = async () => {
    const response = await api.get('/assignments/');
    setAssignments(response.data);
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentExamId || !assignmentBatchId) return;
    await api.post('/assignments/', {
      exam_id: assignmentExamId,
      batch_id: assignmentBatchId,
      student_id: null,
    });
    setAssignmentExamId('');
    setAssignmentBatchId('');
    fetchAssignments();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Exam Administration</p>
        <h1 className="text-2xl font-bold text-foreground">Assign Exams</h1>
        <p className="text-sm text-muted-foreground mt-1">Assign exams to existing batches.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Assign Exam</h2>
          <form onSubmit={handleCreateAssignment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Exam</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={assignmentExamId}
                onChange={(e) => setAssignmentExamId(e.target.value)}
                required
              >
                <option value="">Select exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title} ({exam.exam_code || '-'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={assignmentBatchId}
                onChange={(e) => setAssignmentBatchId(e.target.value)}
                required
              >
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name} ({batch.batch_code || '-'})</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                Assign Exam
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Assignments</h3>
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No assignments yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="border-b border-border/30 pb-2 last:border-0">
                  <p className="text-sm font-medium text-foreground">
                    Exam {assignment.exam_code || '-'} · {assignment.batch_id ? `Batch ${assignment.batch_code || '-'}` : `Student ${assignment.student_code || '-'}`}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
