import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { Clock, Flag, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listMyAssignments, listMySessions, listQuestionsForExam } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';
import { Question } from '@/types';

const ExamAttemptPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(2700); // 45 min
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const { data: assignments = [] } = useQuery({
    queryKey: ['exam-attempt', 'assignments'],
    queryFn: listMyAssignments,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['exam-attempt', 'sessions'],
    queryFn: listMySessions,
  });

  const activeExamIds = new Set([
    ...assignments.filter((exam) => exam.status === 'live').map((exam) => exam.id),
    ...sessions.filter((session) => session.status === 'in_progress').map((session) => session.exam_id),
  ]);
  const storedExamId = sessionStorage.getItem('student_active_exam_id');
  const selectedExam =
    assignments.find((exam) => exam.id === storedExamId)
    || assignments.find((exam) => activeExamIds.has(exam.id))
    || assignments[0]
    || null;

  const {
    data: questions = [],
    error: questionsError,
  } = useQuery<Question[]>({
    queryKey: ['exam-attempt', 'questions', selectedExam?.id],
    queryFn: () => listQuestionsForExam(selectedExam!.id),
    enabled: !!selectedExam?.id,
  });

  useEffect(() => {
    if (questionsError) {
      toast({ title: 'Failed to load exam questions', description: (questionsError as Error).message, variant: 'destructive' });
    }
  }, [questionsError, toast]);

  useEffect(() => {
    setCurrentQ(0);
    setAnswers({});
    setFlagged(new Set());
    const durationMinutes = Math.max(1, selectedExam?.duration || 45);
    setTimeLeft(durationMinutes * 60);
  }, [selectedExam?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setShowTabWarning(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleSubmit = () => {
    navigate('/student/exam-submitted');
  };

  const q = questions[currentQ];
  const progress = questions.length ? (Object.keys(answers).length / questions.length) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!selectedExam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">No Exam Available</h2>
          <p className="text-sm text-muted-foreground mb-4">No assigned exam is available to attempt right now.</p>
          <Button onClick={() => navigate('/student/exams')}>Back to Exams</Button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Loading Questions</h2>
          <p className="text-sm text-muted-foreground">Fetching exam questions from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-topbar text-topbar-foreground px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">{selectedExam.title}</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4" />
            <span className={`font-mono font-semibold ${timeLeft < 300 ? 'text-destructive' : ''}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <Progress value={progress} className="w-32 h-2" />
          <span className="text-xs text-topbar-muted">{Object.keys(answers).length}/{questions.length}</span>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Question nav */}
        <div className="w-20 bg-card border-r p-3 flex flex-col gap-2 overflow-y-auto">
          {questions.map((mq, i) => (
            <button
              key={mq.id}
              onClick={() => setCurrentQ(i)}
              className={`h-10 w-full rounded-md text-xs font-semibold transition-colors ${
                i === currentQ ? 'bg-accent text-accent-foreground' :
                answers[mq.id] ? 'bg-success/20 text-success' :
                flagged.has(mq.id) ? 'bg-warning/20 text-warning' :
                'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question area */}
        <div className="flex-1 p-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">Question {currentQ + 1} of {questions.length}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{q.marks} marks</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
                className={flagged.has(q.id) ? 'border-warning text-warning' : ''}
              >
                <Flag className="h-4 w-4 mr-1" />{flagged.has(q.id) ? 'Flagged' : 'Flag'}
              </Button>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-6">{q.text}</h2>

          {q.type === 'mcq' ? (
            <RadioGroup value={answers[q.id] || ''} onValueChange={(val) => setAnswers({ ...answers, [q.id]: val })}>
              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <label key={i} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === opt ? 'border-accent bg-accent/5' : 'border-border hover:bg-muted/50'
                  }`}>
                    <RadioGroupItem value={opt} />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <Textarea
              placeholder="Type your answer..."
              className="min-h-[160px]"
              value={answers[q.id] || ''}
              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          )}

          <div className="flex justify-between mt-8">
            <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ(c => c - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Previous
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button onClick={() => setCurrentQ(c => c + 1)} className="bg-accent text-accent-foreground">
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => setShowSubmitConfirm(true)} className="bg-success text-success-foreground">
                <Send className="h-4 w-4 mr-1" />Submit Exam
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showTabWarning} onOpenChange={setShowTabWarning}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>⚠️ Tab Switch Detected</AlertDialogTitle>
            <AlertDialogDescription>Switching tabs during the exam is flagged as a violation. This has been recorded.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction>I Understand</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(answers).length} of {questions.length} questions.
              {Object.keys(answers).length < questions.length && ' Some questions are unanswered.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExamAttemptPage;
