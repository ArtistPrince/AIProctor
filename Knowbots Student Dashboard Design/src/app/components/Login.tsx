import React from "react";
import { motion } from "motion/react";
import { User, Lock, ArrowRight, Cpu } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";

interface LoginProps {
  onLogin: (name: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [fullName, setFullName] = React.useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onLogin(fullName || 'Alex Johnson');
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/20 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-300/20 blur-[100px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-white text-2xl font-bold tracking-tight">
            
            <span>KNOWBOTS <span className="text-purple-400">LMS</span></span>
          </div>
        </div>

        <Card className="border-purple-400/20 bg-[#2a145c]/50 backdrop-blur-xl shadow-2xl shadow-purple-900/30">

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">Student Portal</CardTitle>
            <CardDescription className="text-purple-200">Enter your credentials to access the exam dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Alex Johnson"
                  icon={<User className="h-4 w-4" />}
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  label="Registration Number"
                  placeholder="e.g. REG-2024-001"
                  type="text"
                  icon={<Lock className="h-4 w-4" />}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 text-white font-semibold py-6 shadow-lg shadow-fuchsia-500/25 border-none"

                isLoading={isLoading}
              >
                Sign In Securely
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <div className="text-center pt-2">
                <a href="#" className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                  Don't have an account? <span className="text-purple-400 font-medium">Create New Account</span>
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-purple-200 text-xs mt-8">
          Protected by enterprise-grade AI proctoring system. <br/>
          v2.4.0 • Secure Connection
        </p>
      </motion.div>
    </div>
  );
};