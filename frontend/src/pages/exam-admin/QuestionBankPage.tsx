import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

interface Exam {
  id: string;
  title: string;
}

interface Question {
  id: string;
  exam_id: string;
  type: string;
  text: string;
  marks: number;
  data?: {
    options?: string[];
    correct_answer?: number | string;
    correct_answer_text?: string;
    [key: string]: unknown;
  };
}

export default function QuestionBankPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchExams();
    fetchQuestions();
  }, []);

  const examTitleById = useMemo(() => {
    const map = new Map<string, string>();
    exams.forEach((exam) => map.set(exam.id, exam.title));
    return map;
  }, [exams]);

  const fetchExams = async () => {
    const response = await api.get('/exams/');
    setExams(response.data);
  };

  const fetchQuestions = async () => {
    const response = await api.get('/questions/');
    setQuestions(response.data);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Exam Administration</p>
        <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
        <p className="text-sm text-muted-foreground mt-1">View questions available in the database with their subject name.</p>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Questions</h3>
        <div className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No questions available.</p>
          ) : (
            questions.map((question) => (
              <div key={question.id} className="border-b border-border/30 pb-2 last:border-0">
                <p className="text-sm font-medium text-foreground">[{question.type}] {question.text}</p>
                <p className="text-xs text-muted-foreground">
                  Subject: {examTitleById.get(question.exam_id) || question.exam_id} · {question.marks} marks
                </p>
                {question.type === 'MCQ' && question.data?.correct_answer !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Correct Answer: {typeof question.data.correct_answer === 'number' 
                      ? String.fromCharCode(65 + question.data.correct_answer)
                      : question.data.correct_answer}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
