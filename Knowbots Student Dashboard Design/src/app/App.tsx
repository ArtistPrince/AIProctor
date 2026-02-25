import React, { useState } from "react";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { ExamInterface } from "./components/ExamInterface";
import { Result } from "./components/Result";
import { Verification } from "./components/Verification";
import { AnimatePresence, motion } from "motion/react";
import "../styles/theme.css";

type View = 'login' | 'dashboard' | 'verify' | 'exam' | 'result';


function App() {
  const [currentView, setCurrentView] = useState<View>('login');
  const [examResult, setExamResult] = useState<{ score: number; integrity: number } | null>(null);
  const [studentName, setStudentName] = useState<string>('Alex Johnson');

  const handleLogin = (name: string) => {
    setStudentName(name);
    setCurrentView('dashboard');
  };

  const handleStartExam = () => {
    setCurrentView('verify');
  };

  const handleExamSubmit = (score: number, integrity: number) => {
    setExamResult({ score, integrity });
    setCurrentView('result');
  };

  const handleBackToDashboard = () => {
    setExamResult(null);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setStudentName('Alex Johnson');
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-purple-500/30">

      <AnimatePresence>

        {currentView === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Login onLogin={handleLogin} />
          </motion.div>
        )}

        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Dashboard onStartExam={handleStartExam} onLogout={handleLogout} studentName={studentName} />
          </motion.div>
        )}

        {currentView === 'verify' && (
  <motion.div
    key="verify"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="w-full h-full"
  >
    <Verification onVerified={() => {
  console.log("VERIFIED CALLED");
  setCurrentView('exam');
}} />

  </motion.div>
)}


        {currentView === 'exam' && (
          <motion.div
            key="exam"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full h-full"
          >
            <ExamInterface onSubmit={handleExamSubmit} />
          </motion.div>
        )}

        {currentView === 'result' && examResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <Result 
              score={examResult.score} 
              integrity={examResult.integrity} 
              onBack={handleBackToDashboard} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;