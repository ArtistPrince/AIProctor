
import Webcam from "react-webcam";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Flag, 
  Maximize2,
  Eye,
  Wifi,
  Battery
} from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { cn } from "../../lib/utils";

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { getFaceDescriptor } from "../../lib/faceStore";


interface ExamInterfaceProps {
  onSubmit: (score: number, integrity: number) => void;
}

const questions = [
  {
    id: 1,
    text: "Which of the following is NOT a type of Machine Learning?",
    options: [
      "Supervised Learning",
      "Unsupervised Learning",
      "Reinforcement Learning",
      "Deductive Learning"
    ],
    correct: 3
  },
  {
    id: 2,
    text: "In Neural Networks, what is the function of an activation function?",
    options: [
      "To introduce non-linearity",
      "To increase the speed of training",
      "To reduce the number of neurons",
      "To normalize the input data"
    ],
    correct: 0
  },
  {
    id: 3,
    text: "What is the primary purpose of a Convolutional Neural Network (CNN)?",
    options: [
      "Natural Language Processing",
      "Image Recognition",
      "Audio Synthesis",
      "Time Series Analysis"
    ],
    correct: 1
  }
];

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ onSubmit }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [warnings, setWarnings] = useState(0);
  const [attention, setAttention] = useState(98);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const webcamRef = useRef<Webcam | null>(null);
  const monitorRef = useRef<NodeJS.Timeout | null>(null);


  
  const [warning, setWarning] = useState("");
  const warningCount = useRef(0);
  useEffect(() => {
  startMonitoring();
}, []);

useEffect(() => {
  return () => {
    if (monitorRef.current) clearInterval(monitorRef.current);
  };
}, []);


const startMonitoring = async () => {
  const savedDescriptor = getFaceDescriptor();
  if (!savedDescriptor) return;

  const video = webcamRef.current?.video as HTMLVideoElement;

if (!video) {
  console.log("Camera not ready yet...");
  return;
}


await new Promise((resolve) => {
  if (video.readyState >= 3) resolve(true);
  else video.onloadeddata = () => resolve(true);
});


  // load models (needed again in this page)
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
  await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

  monitorRef.current = setInterval(async () => {
    if (!videoRef.current) return;

    const detection = await faceapi
      .detectSingleFace(
  video,
  new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  })
)

      .withFaceLandmarks()
      .withFaceDescriptor();

    // no face
    if (!detection) {
  setWarning("⚠ No face detected! Return to your seat.");
  warningCount.current++;
  setWarnings(w => w + 1);
  return;
}


    // compare faces
    const distance = faceapi.euclideanDistance(
      savedDescriptor,
      detection.descriptor
    );

    // threshold check
    if (distance > 0.55) {
  setWarning("🚨 Different person detected!");
  warningCount.current++;
  setWarnings(w => w + 1);
}


    // optional auto terminate
    if (warningCount.current >= 5) {
      alert("Exam terminated due to identity violation.");
      window.location.reload();
    }

  }, 4000);
};



  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulated AI Attention Monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly fluctuate attention between 85 and 100
      setAttention(Math.floor(Math.random() * (100 - 85 + 1) + 85));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let score = 0;
    answers.forEach((ans, idx) => {
      if (ans === questions[idx].correct) score += 1;
    });
    const finalScore = Math.round((score / questions.length) * 100);
    
    // Calculate integrity (mock)
    const integrity = Math.max(0, 100 - (warnings * 10));
    
    onSubmit(finalScore, integrity);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col h-screen overflow-hidden selection:bg-purple-500/30">
      
      {/* Top Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="font-bold text-xl tracking-tight text-white">KNOWBOTS <span className="text-purple-500">LMS</span></div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="text-sm text-slate-400">Advanced AI Algorithms • CS-405</div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Clock className="h-4 w-4 text-purple-400 animate-pulse" />
            <span className="font-mono text-xl font-bold text-white">{formatTime(timeLeft)}</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="hover:bg-slate-800">
            <Maximize2 className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="primary" 
            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-red-900/20"
            onClick={handleSubmit}
          >
            Finish Exam
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Main Question Area */}
        <main className="flex-1 p-8 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Question Progress */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-2">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id}
                    className={cn(
                      "h-2 w-12 rounded-full transition-all duration-300",
                      idx === currentQuestion ? "bg-purple-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" : 
                      answers[idx] !== -1 ? "bg-purple-500/40" : "bg-slate-800"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-500">Question {currentQuestion + 1} of {questions.length}</span>
            </div>

            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm p-8 min-h-[400px] flex flex-col justify-center shadow-xl">
                <h2 className="text-2xl font-medium text-white mb-8 leading-relaxed">
                  {questions[currentQuestion].text}
                </h2>

                <div className="grid gap-4">
                  {questions[currentQuestion].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center group",
                        answers[currentQuestion] === idx 
                          ? "bg-purple-600/10 border-purple-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]" 
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800 text-slate-300"
                      )}
                    >
                      <div className={cn(
                        "h-6 w-6 rounded-full border flex items-center justify-center mr-4 transition-colors",
                        answers[currentQuestion] === idx
                          ? "border-purple-500 bg-purple-500 text-white"
                          : "border-slate-600 group-hover:border-slate-500"
                      )}>
                        {answers[currentQuestion] === idx && <div className="h-2 w-2 bg-white rounded-full" />}
                      </div>
                      <span className="text-lg">{option}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div className="flex justify-between items-center pt-8">
              <Button 
                variant="secondary" 
                onClick={handlePrev}
                disabled={currentQuestion === 0}
                className="pl-2 hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex gap-4">
                 <Button variant="ghost" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                    <Flag className="h-4 w-4 mr-2" /> Mark for Review
                 </Button>
                 <Button 
                  variant="primary" 
                  onClick={handleNext}
                  disabled={currentQuestion === questions.length - 1}
                  className="pr-2 bg-purple-600 hover:bg-purple-500 border-none shadow-purple-500/20"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

          </div>
        </main>

        {/* AI Proctor Side Panel */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 shrink-0 z-10">
          
          {/* Webcam Feed */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl shadow-black/50 border border-slate-700">
             <Webcam
                ref={webcamRef}
                audio={false}
                width="100%"
                height="100%"
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="object-cover w-full h-full opacity-80"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                <span className="text-[10px] font-bold text-red-500 bg-black/50 px-1 rounded uppercase tracking-wider">REC</span>
              </div>
              
              {/* Face Mesh Overlay Simulation */}
              <div className="absolute inset-0 border-[2px] border-dashed border-purple-500/30 m-8 rounded-lg pointer-events-none" />
          </div>

          {/* Status Metrics */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <span>Attention Level</span>
                <span className={cn(attention < 90 ? "text-amber-400" : "text-purple-300")}>{attention}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className={cn("h-full rounded-full transition-colors duration-500", attention < 90 ? "bg-amber-500" : "bg-purple-500")}
                  animate={{ width: `${attention}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                 <Wifi className="h-4 w-4 text-purple-300" />
                 <div>
                    <div className="text-xs text-slate-400">Network</div>
                    <div className="text-xs font-medium text-purple-300">Stable</div>
                 </div>
               </div>
               <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-center gap-3">
                 <Battery className="h-4 w-4 text-purple-300" />
                 <div>
                    <div className="text-xs text-slate-400">Power</div>
                    <div className="text-xs font-medium text-purple-300">98%</div>
                 </div>
               </div>
            </div>
          </div>

          {/* Warnings Section */}
          <div className="mt-auto bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-red-400 font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Warnings Issued</span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{warnings}</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Eye movement anomaly detected. Please focus on the screen to avoid further flags.
            </p>
            <Button 
              size="sm" 
              variant="danger" 
              className="w-full mt-4 text-xs h-8 hover:bg-red-500/20"
              onClick={() => setWarnings(w => w + 1)}
            >
              Simulate Warning (Demo)
            </Button>
          </div>

        </aside>

      </div>
      

    </div>
  );
};
