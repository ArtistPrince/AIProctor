import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

interface Exam {
  id: string;
  title: string;
  duration_minutes: number;
}

interface Faculty {
  id: string;
  name: string;
  dept_code: string;
}

interface Question {
  id: string;
  exam_id: string;
  type: string;
  text: string;
  marks: number;
  data: {
    options?: string[];
    correct_answer?: string;
    [key: string]: unknown;
  };
}

export default function ExamSetupPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  const [facultyId, setFacultyId] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [examType, setExamType] = useState('MID');
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString().slice(-2));
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [passingMarks, setPassingMarks] = useState(40);
  const [scheduledTime, setScheduledTime] = useState('');

  const [questionExamId, setQuestionExamId] = useState<string>('');
  const [questionType, setQuestionType] = useState('MCQ');
  const [questionText, setQuestionText] = useState('');
  const [questionMarks, setQuestionMarks] = useState(1);
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectAnswerIndex, setMcqCorrectAnswerIndex] = useState<number | null>(null);
  const [questionError, setQuestionError] = useState('');

  useEffect(() => {
    fetchExams();
    fetchFaculties();
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

  const fetchFaculties = async () => {
    const response = await api.get('/faculties/');
    setFaculties(response.data);
  };

  const fetchQuestions = async () => {
    const response = await api.get('/questions/');
    setQuestions(response.data);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyId) return;
    await api.post('/exams/', {
      faculty_id: facultyId,
      subject_code: subjectCode,
      exam_type: examType,
      exam_year: examYear,
      title,
      duration: Number(duration),
      passing_marks: Number(passingMarks),
      scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
    });
    setTitle('');
    setSubjectCode('');
    setScheduledTime('');
    setFacultyId('');
    fetchExams();
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError('');
    if (!questionExamId) return;

    let payloadData: Record<string, unknown> = {};
    if (questionType === 'MCQ') {
      const options = mcqOptions.map((opt) => opt.trim()).filter((opt) => opt.length > 0);
      if (options.length < 2) {
        setQuestionError('Please provide at least 2 options for MCQ.');
        return;
      }
      if (mcqCorrectAnswerIndex === null || mcqCorrectAnswerIndex === undefined) {
        setQuestionError('Please select the correct answer by clicking A, B, C, or D.');
        return;
      }
      // Map the selected index to the actual option text (for display purposes)
      const filledOptions = mcqOptions.filter((opt) => opt.trim().length > 0);
      const correctOptionText = filledOptions[mcqCorrectAnswerIndex];
      payloadData = { options, correct_answer: mcqCorrectAnswerIndex, correct_answer_text: correctOptionText };
    }

    await api.post('/questions/', {
      exam_id: questionExamId,
      type: questionType,
      text: questionText,
      marks: Number(questionMarks),
      data: payloadData,
    });
    setQuestionText('');
    setQuestionMarks(1);
    setMcqOptions(['', '', '', '']);
    setMcqCorrectAnswerIndex(null);
    fetchQuestions();
  };

  const updateOption = (index: number, value: string) => {
    setMcqOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Exam Administration</p>
        <h1 className="text-2xl font-bold text-foreground">Exam Setup</h1>
        <p className="text-sm text-muted-foreground mt-1">Create exams and add questions.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create Exam</h2>
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Faculty</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                required
              >
                <option value="">Select faculty</option>
                {faculties.map((faculty) => (
                  <option key={faculty.id} value={faculty.id}>
                    {faculty.name} ({faculty.dept_code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Subject Code</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Exam Type</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={examType}
                  onChange={(e) => setExamType(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
              <input
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Duration (minutes)</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Passing Marks</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={passingMarks}
                onChange={(e) => setPassingMarks(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Scheduled Time</label>
              <input
                type="datetime-local"
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Save Exam
            </button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Question</h2>
          <form onSubmit={handleCreateQuestion} className="space-y-4">
            {questionError && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {questionError}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Exam</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={questionExamId}
                onChange={(e) => setQuestionExamId(e.target.value)}
              >
                <option value="">Select exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
                <select
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <option value="MCQ">MCQ</option>
                  <option value="Coding">Coding</option>
                  <option value="Descriptive">Descriptive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Marks</label>
                <input
                  type="number"
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={questionMarks}
                  onChange={(e) => setQuestionMarks(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Question</label>
              <textarea
                className="w-full rounded-lg bg-secondary border border-border text-sm p-3"
                rows={3}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>
            {questionType === 'MCQ' && (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-muted-foreground mb-2">Options (A, B, C, D)</label>
                <div className="space-y-2">
                  {mcqOptions.map((option, index) => {
                    const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                    const isCorrect = mcqCorrectAnswerIndex === index;
                    return (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          className="flex-1 h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                          placeholder={`Option ${optionLabel}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2 mt-3">Select Correct Answer</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['A', 'B', 'C', 'D'].map((label, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setMcqCorrectAnswerIndex(index)}
                        className={`h-10 rounded-lg font-semibold text-sm transition-all ${
                          mcqCorrectAnswerIndex === index
                            ? 'bg-primary text-primary-foreground border-2 border-primary'
                            : 'bg-secondary border-2 border-border hover:border-primary text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Add Question
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Exams</h3>
          <div className="space-y-3">
            {exams.length === 0 ? (
              <p className="text-xs text-muted-foreground">No exams yet.</p>
            ) : (
              exams.map((exam) => (
                <div key={exam.id} className="border-b border-border/30 pb-2 last:border-0">
                  <p className="text-sm font-medium text-foreground">{exam.title}</p>
                  <p className="text-xs text-muted-foreground">{exam.duration_minutes} min</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Questions</h3>
          <div className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No questions yet.</p>
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
    </div>
  );
}
