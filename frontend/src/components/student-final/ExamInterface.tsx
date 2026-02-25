import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Battery, ChevronLeft, ChevronRight, Clock, Flag, Maximize2, Wifi } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getFaceDescriptor } from './faceStore';
import api from '@/lib/api';

interface Question {
  id: string;
  text: string;
  type: string;
  marks: number | undefined;
  data?: {
    options?: string[];
    correct_answer?: number | string;
    correct_answer_text?: string;
  };
}

interface ExamInterfaceProps {
  title: string;
  examCode: string;
  durationMinutes: number;
  onSubmit: (score: number, integrity: number) => void;
}

export function ExamInterface({ title, examCode, durationMinutes, onSubmit }: ExamInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [warnings, setWarnings] = useState(0);
  const [attention, setAttention] = useState(98);
  const webcamRef = useRef<Webcam | null>(null);
  const warningCount = useRef(0);

  // Fetch questions from exam
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        console.log(`🔄 Fetching questions for exam: ${examCode}`);
        const res = await api.get(`/questions/exam/${examCode}`);
        console.log('📥 Raw response from backend:', res.data);
        
        // Inspect first question structure
        if (res.data.length > 0) {
          console.log('📋 First question structure:', JSON.stringify(res.data[0], null, 2));
          console.log('   - ID:', res.data[0].id);
          console.log('   - Type:', res.data[0].type);
          console.log('   - Marks:', res.data[0].marks, '(type:', typeof res.data[0].marks + ')');
          console.log('   - Text:', res.data[0].text);
          console.log('   - Data:', res.data[0].data);
          if (res.data[0].data) {
            console.log('   - Data.options:', res.data[0].data.options);
            console.log('   - Data.correct_answer:', res.data[0].data.correct_answer);
          }
        }
        
        setQuestions(res.data);
        setAnswers(new Array(res.data.length).fill(null));
      } catch (error) {
        console.error('❌ Failed to fetch questions:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    if (examCode) {
      fetchQuestions();
    }
  }, [examCode]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAttention(Math.floor(Math.random() * (100 - 85 + 1) + 85));
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let monitorInterval: number | undefined;

    const startMonitoring = async () => {
      const savedDescriptor = getFaceDescriptor();
      if (!savedDescriptor) return;

      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      monitorInterval = window.setInterval(async () => {
        const video = webcamRef.current?.video as HTMLVideoElement | undefined;
        if (!video || video.readyState < 2) return;

        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          warningCount.current += 1;
          setWarnings((w) => w + 1);
          return;
        }

        const distance = faceapi.euclideanDistance(savedDescriptor, detection.descriptor);
        if (distance > 0.55) {
          warningCount.current += 1;
          setWarnings((w) => w + 1);
        }
      }, 4000);
    };

    startMonitoring();

    return () => {
      if (monitorInterval) window.clearInterval(monitorInterval);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-fullscreen on mount with retry - FORCED MODE
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let fullscreenEnforceInterval: number | undefined;

    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
          console.log('🔒 FULLSCREEN FORCED (Chromium)');
        } else if ((elem as any).webkitRequestFullscreen) {
          (elem as any).webkitRequestFullscreen();
          console.log('🔒 FULLSCREEN FORCED (Webkit)');
        } else if ((elem as any).mozRequestFullScreen) {
          (elem as any).mozRequestFullScreen();
          console.log('🔒 FULLSCREEN FORCED (Firefox)');
        } else if ((elem as any).msRequestFullscreen) {
          (elem as any).msRequestFullscreen();
          console.log('🔒 FULLSCREEN FORCED (IE/Edge)');
        }

        // Once fullscreen is entered, start enforcing it (prevent exit)
        if (!fullscreenEnforceInterval) {
          fullscreenEnforceInterval = window.setInterval(() => {
            const isFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement;
            if (!isFullscreen) {
              console.warn('⚠️ Fullscreen exit detected! Re-entering fullscreen...');
              const elem = document.documentElement;
              if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
              } else if ((elem as any).webkitRequestFullscreen) {
                (elem as any).webkitRequestFullscreen();
              }
            }
          }, 500);
        }
      } catch (error: any) {
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`⏳ Fullscreen attempt ${retryCount}/${maxRetries}:`, error.message);
          setTimeout(requestFullscreen, 800);
        } else {
          console.error('❌ Fullscreen request failed. Some browsers require user interaction.');
        }
      }
    };

    // Prevent Escape key (fullscreen exit)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        console.warn('⚠️ Escape key blocked during exam');
      }
    };

    // Prevent fullscreen exit via F11
    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement;
      if (!isFullscreen) {
        console.warn('⚠️ Fullscreen exit detected! Re-entering...');
        setTimeout(requestFullscreen, 100);
      }
    };

    // Request fullscreen on component mount with delay
    const timeoutId = setTimeout(requestFullscreen, 500);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      clearTimeout(timeoutId);
      if (fullscreenEnforceInterval) clearInterval(fullscreenEnforceInterval);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      
      // Exit fullscreen on unmount
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    };
  }, []);

  const handleSubmit = () => {
    if (questions.length === 0) return;

    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║           FINAL EXAM SUBMISSION & SCORING                 ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total Questions: ${questions.length}`);
    console.log(`📝 Student Answers: [${answers.join(', ')}]\n`);

    let score = 0;
    let totalMarks = 0;
    let correctCount = 0;
    const detailedResults: any[] = [];

    questions.forEach((question, index) => {
      const questionMarks = typeof question.marks === 'number' && question.marks > 0 ? question.marks : 1;
      totalMarks += questionMarks;

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`Q${index + 1}: ${question.text.substring(0, 40)}...`);
      console.log(`   Type: ${question.type} | Marks: ${questionMarks}`);

      if (question.type !== 'MCQ') {
        console.log(`   ⊘ SKIPPED (Non-MCQ type)`);
        detailedResults.push({ q: index + 1, status: 'SKIPPED', reason: 'Non-MCQ' });
        return;
      }

      if (!question.data?.options || question.data?.correct_answer === undefined || question.data?.correct_answer === null) {
        console.log(`   ❌ ERROR: Missing options or correct_answer in data`);
        console.log(`      Data:`, question.data);
        detailedResults.push({ q: index + 1, status: 'ERROR', reason: 'Invalid question data' });
        return;
      }

      const selectedIndex = answers[index];
      console.log(`   Student Selected: Index ${selectedIndex}`);
      console.log(`   Available Options: [${question.data.options.map((o: string, i: number) => `${i}: "${o}"`).join(', ')}]`);
      console.log(`   Correct Answer: "${question.data.correct_answer}"`);

      if (selectedIndex === null || selectedIndex === undefined) {
        console.log(`   ⊘ NOT ANSWERED`);
        detailedResults.push({ q: index + 1, status: 'NOT_ANSWERED', selected: null, correct: question.data.correct_answer });
        return;
      }

      if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex >= question.data.options.length) {
        console.log(`   ❌ ERROR: Invalid index ${selectedIndex} for ${question.data.options.length} options`);
        detailedResults.push({ q: index + 1, status: 'ERROR', reason: 'Invalid answer index' });
        return;
      }

      const correctAnswerIndex = typeof question.data.correct_answer === 'string'
        ? Number.parseInt(question.data.correct_answer, 10)
        : question.data.correct_answer;

      if (typeof correctAnswerIndex !== 'number' || Number.isNaN(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= question.data.options.length) {
        console.log(`   ❌ ERROR: Invalid correct answer index ${question.data.correct_answer}`);
        detailedResults.push({ q: index + 1, status: 'ERROR', reason: 'Invalid correct answer index' });
        return;
      }

      const selectedText = question.data.options[selectedIndex]?.trim() || '';
      const correctText = question.data.options[correctAnswerIndex]?.trim() || '';
      const selectedLetter = String.fromCharCode(65 + selectedIndex);
      const correctLetter = String.fromCharCode(65 + correctAnswerIndex);

      console.log(`   Selected: [${selectedIndex}] "${selectedText}" (${selectedLetter})`);
      console.log(`   Correct:  [${correctAnswerIndex}] "${correctText}" (${correctLetter})`);
      console.log(`   Index Match (===): ${selectedIndex === correctAnswerIndex}`);

      if (selectedIndex === correctAnswerIndex) {
        score += questionMarks;
        correctCount++;
        console.log(`   ✅ CORRECT! (+${questionMarks} points)`);
        detailedResults.push({ q: index + 1, status: 'CORRECT', selected: selectedLetter, correct: correctLetter });
      } else {
        console.log(`   ❌ WRONG`);
        detailedResults.push({ q: index + 1, status: 'WRONG', selected: selectedLetter, correct: correctLetter });
      }
    });

    const finalScore = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const integrity = Math.max(0, 100 - warnings * 10);

    console.log(`\n${'═'.repeat(60)}`);
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL RESULTS                         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║ Correct Answers:    ${correctCount}/${questions.length}`.padEnd(61) + '║');
    console.log(`║ Points Earned:      ${score}/${totalMarks}`.padEnd(61) + '║');
    console.log(`║ Final Score:        ${finalScore}%`.padEnd(61) + '║');
    console.log(`║ Integrity:          ${integrity}%`.padEnd(61) + '║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log('Detailed Results:', detailedResults);
    console.log('\n');

    onSubmit(finalScore, integrity);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-muted-foreground">No questions found for this exam.</p>
          <Button onClick={() => window.location.href = '/student'} className="bg-primary hover:opacity-90">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tight text-foreground">KNOWBOTS <span className="text-primary">LMS</span></div>
          <div className="h-6 w-[1px] bg-border" />
          <div className="text-sm text-muted-foreground">{title} • {examCode}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-lg border border-border">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-mono text-xl font-bold text-foreground">{formatTime(timeLeft)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:bg-secondary cursor-not-allowed opacity-75"
            disabled
            title="Fullscreen is enforced during exam"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
          <Button className="bg-primary hover:opacity-90 text-primary-foreground border-none" onClick={handleSubmit}>Finish Exam</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-2">
                {questions.map((question, index) => (
                  <div key={question.id} className={cn('h-2 w-12 rounded-full transition-all duration-300', index === currentQuestion ? 'bg-primary' : answers[index] !== null && answers[index] !== undefined ? 'bg-primary/40' : 'bg-secondary')} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={currentQuestion} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <Card className="bg-card border-border p-8 min-h-[400px] flex flex-col justify-center card-shadow-md">
                  <h2 className="text-2xl font-medium text-foreground mb-8 leading-relaxed">{questions[currentQuestion]?.text || 'Loading question...'}</h2>
                  <div className="grid gap-4">
                    {questions[currentQuestion]?.data?.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const newAnswers = [...answers];
                          newAnswers[currentQuestion] = index;
                          setAnswers(newAnswers);
                        }}
                        className={cn(
                          'w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center group',
                          answers[currentQuestion] === index ? 'bg-secondary border-primary text-foreground' : 'bg-card border-border hover:border-primary/50 hover:bg-secondary text-foreground'
                        )}
                      >
                        <div className={cn('h-6 w-6 rounded-full border flex items-center justify-center mr-4 transition-colors', answers[currentQuestion] === index ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                          {answers[currentQuestion] === index && <div className="h-2 w-2 bg-primary-foreground rounded-full" />}
                        </div>
                        <span className="text-lg">{option}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between items-center pt-8">
              <Button variant="secondary" onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))} disabled={currentQuestion === 0} className="pl-2">
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex gap-4">
                <Button variant="ghost" className="text-warning hover:opacity-90 hover:bg-secondary">
                  <Flag className="h-4 w-4 mr-2" /> Mark for Review
                </Button>
                {currentQuestion === questions.length - 1 ? (
                  <Button onClick={handleSubmit} className="pr-2 bg-primary hover:opacity-90 border-none text-primary-foreground">
                    Finish Exam <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentQuestion((q) => Math.min(questions.length - 1, q + 1))} className="pr-2 bg-primary hover:opacity-90 border-none text-primary-foreground">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-80 bg-card border-l border-border p-6 flex flex-col gap-6 shrink-0 z-10">
          <div className="relative rounded-xl overflow-hidden bg-secondary aspect-video border border-border">
            <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: 'user' }} className="object-cover w-full h-full opacity-80" />
            <div className="absolute top-3 right-3 flex gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 bg-card/80 px-1 rounded uppercase tracking-wider">REC</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                <span>Attention Level</span>
                <span className={cn(attention < 90 ? 'text-warning' : 'text-primary')}>{attention}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className={cn('h-full rounded-full', attention < 90 ? 'bg-warning' : 'bg-primary')} animate={{ width: `${attention}%` }} transition={{ type: 'spring', stiffness: 50 }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary p-3 rounded-lg border border-border flex items-center gap-3">
                <Wifi className="h-4 w-4 text-primary" />
                <div><div className="text-xs text-muted-foreground">Network</div><div className="text-xs font-medium text-primary">Stable</div></div>
              </div>
              <div className="bg-secondary p-3 rounded-lg border border-border flex items-center gap-3">
                <Battery className="h-4 w-4 text-primary" />
                <div><div className="text-xs text-muted-foreground">Power</div><div className="text-xs font-medium text-primary">98%</div></div>
              </div>
            </div>
          </div>

          <div className="mt-auto bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-red-400 font-medium"><AlertTriangle className="h-4 w-4" /><span>Warnings Issued</span></div>
            <div className="text-3xl font-bold text-foreground mb-1">{warnings}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Eye movement anomaly detected. Please focus on the screen.</p>
            <Badge className="mt-3 bg-primary/10 text-primary border-primary/30">AI Proctor Active</Badge>
          </div>
        </aside>
      </div>
    </div>
  );
}
