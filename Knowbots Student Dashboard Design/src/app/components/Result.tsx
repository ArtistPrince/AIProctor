import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Home } from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";

interface ResultProps {
  score: number;
  integrity: number;
  onBack: () => void;
}

export const Result: React.FC<ResultProps> = ({ score, integrity, onBack }) => {
  const isPassed = score >= 60;
  const isHighIntegrity = integrity >= 90;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-purple-500/30">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-lg"
      >
        <Card className="border-purple-500/20 bg-slate-900/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-48 w-48 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

          <CardHeader className="text-center pb-2 relative z-10">
            <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2">Examination Complete</CardTitle>
            <CardDescription className="text-slate-400">Your responses have been submitted securely.</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8 relative z-10 pt-8">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-2">Total Score</div>
                 <div className="text-4xl font-bold text-white mb-1">{score}%</div>
                 <div className={isPassed ? "text-purple-300 text-xs" : "text-red-400 text-xs"}>
                   {isPassed ? "PASSED" : "FAILED"}
                 </div>
              </div>

              <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center relative overflow-hidden group hover:border-purple-500/30 transition-all">
                 <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <div className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-2">Integrity Score</div>
                 <div className="text-4xl font-bold text-white mb-1">{integrity}%</div>
                 <div className={isHighIntegrity ? "text-purple-300 text-xs" : "text-amber-400 text-xs"}>
                   {isHighIntegrity ? "EXCELLENT" : "REVIEW NEEDED"}
                 </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-medium text-slate-300 mb-4">Detailed Breakdown</h4>
              <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Correct Answers</span>
                   <span className="text-purple-300 font-medium">{Math.round((score / 100) * 3)} / 3</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Time Taken</span>
                   <span className="text-white font-medium">45m 12s</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Warnings Issued</span>
                   <span className="text-amber-400 font-medium">{Math.max(0, (100 - integrity) / 10)}</span>
                 </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-500/20 border-none" 
              onClick={onBack}
            >
              <Home className="mr-2 h-4 w-4" /> Return to Dashboard
            </Button>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
