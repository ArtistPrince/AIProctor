import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Camera, Clock, AlertTriangle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import api from '@/lib/api';

interface Exam {
  id: number;
  title: string;
  duration: number;
}

interface Question {
  id: number;
  exam_id: number;
  type: string;
  text: string;
  data: Record<string, unknown>;
}

export default function LiveExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | number>>({});
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(() => setCameraPermission('granted'))
      .catch(() => setCameraPermission('denied'));

    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      const assignmentsRes = await api.get('/assignments/me').catch(() => ({ data: [] }));
      const assignment = (assignmentsRes.data || []).find((item: { exam?: Exam }) => item.exam?.id === Number(id));
      if (assignment?.exam) {
        setExam(assignment.exam);
        setTimeLeft(assignment.exam.duration * 60);
      }
      const questionsRes = await api.get(`/questions/exam/${id}`).catch(() => ({ data: [] }));
      setQuestions(questionsRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!timeLeft) return undefined;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const currentQuestionItem = questions[currentQuestion];
  const options = useMemo(() => {
    if (!currentQuestionItem) return [] as string[];
    const data = currentQuestionItem.data as { options?: string[] };
    return Array.isArray(data?.options) ? data.options : [];
  }, [currentQuestionItem]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeLeft < 600;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-border bg-white flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{exam?.title || 'Exam'}</span>
            <span className="ml-2 px-2 py-0.5 rounded badge-success text-[10px] font-semibold">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Camera
              className={`h-4 w-4 ${cameraPermission === 'granted' ? 'text-success' : 'text-destructive'}`}
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {cameraPermission === 'granted' ? 'Camera On' : cameraPermission === 'denied' ? 'Camera Blocked' : 'Requesting…'}
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold ${
              isLowTime
                ? 'bg-rose-50 border-rose-200 text-destructive'
                : 'bg-secondary border-border text-foreground'
            }`}
          >
            <Clock className={`h-4 w-4 ${isLowTime ? 'text-destructive' : 'text-muted-foreground'}`} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Question panel */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs text-muted-foreground font-medium">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question text */}
            <div className="bg-white rounded-xl border border-border card-shadow p-6 mb-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Question {currentQuestion + 1}
              </p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading question...</p>
              ) : currentQuestionItem ? (
                <h2 className="text-base font-semibold text-foreground leading-relaxed">
                  {currentQuestionItem.text}
                </h2>
              ) : (
                <p className="text-sm text-muted-foreground">No questions found.</p>
              )}
            </div>

            {/* Options */}
            {currentQuestionItem?.type === 'MCQ' && options.length > 0 && (
              <div className="space-y-2.5">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [currentQuestionItem.id]: i })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm flex items-center gap-3 ${
                      answers[currentQuestionItem.id] === i
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border bg-white text-foreground hover:border-primary/40 hover:bg-secondary/50'
                    }`}
                  >
                    <span
                      className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        answers[currentQuestionItem.id] === i
                          ? 'border-primary bg-primary text-white'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentQuestionItem && currentQuestionItem.type !== 'MCQ' && (
              <textarea
                className="w-full rounded-xl border border-border bg-white p-4 text-sm"
                rows={6}
                placeholder="Type your answer here..."
                value={String(answers[currentQuestionItem.id] ?? '')}
                onChange={(e) => setAnswers({ ...answers, [currentQuestionItem.id]: e.target.value })}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/student')}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-success text-white text-sm font-semibold hover:bg-success/90 transition"
                >
                  <Send className="h-4 w-4" /> Submit Exam
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question navigator sidebar */}
        <aside className="w-56 border-l border-border bg-white p-4 flex-shrink-0">
          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Questions</h4>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`h-8 w-8 rounded-md text-xs font-semibold transition-all border ${
                  i === currentQuestion
                    ? 'bg-primary text-white border-primary'
                    : answers[questions[i].id] !== undefined
                    ? 'bg-success/10 text-success border-success/30'
                    : 'bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/30'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-primary inline-block" /> Current
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-success/20 border border-success/30 inline-block" /> Answered
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="h-3 w-3 rounded-sm bg-secondary border border-border inline-block" /> Not answered
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
              <span className="text-[11px] font-semibold text-amber-800">Proctoring Active</span>
            </div>
            <p className="text-[10px] text-amber-700 leading-relaxed">
              Your camera and screen are being monitored. Tab switches are recorded.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
