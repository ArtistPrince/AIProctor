import React, { useState } from "react";
import { 
  Bell, 
  Settings, 
  LogOut, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  Trophy, 
  BarChart3,
  BookOpen,
  Cpu
} from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { motion } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar } from "./ui/Calendar";

const data = [
  { name: 'Ex 1', score: 65 },
  { name: 'Ex 2', score: 75 },
  { name: 'Ex 3', score: 85 },
  { name: 'Ex 4', score: 78 },
  { name: 'Ex 5', score: 90 },
  { name: 'Ex 6', score: 88 },
];

interface DashboardProps {
  onStartExam: () => void;
  onLogout: () => void;
  studentName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStartExam, onLogout, studentName }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Extract first name from full name
  const firstName = studentName.split(' ')[0];
  // Extract initials
  const initials = studentName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e0b4b] via-[#2b0f6b] to-[#140533] text-slate-200 font-sans selection:bg-purple-500/30">

      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-purple-900/40 bg-[#140533]/70 backdrop-blur-xl">

      
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            
            <span className="font-bold text-xl tracking-tight text-white">KNOWBOTS <span className="text-purple-500">LMS</span></span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-400">
              <a href="#" className="text-white hover:text-purple-400 transition-colors">Dashboard</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Exams</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Results</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Support</a>
            </div>
            <div className="h-4 w-[1px] bg-slate-800 hidden md:block" />
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-slate-800">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-purple-500 border border-slate-950" />
              </Button>
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{studentName}</p>
                  <p className="text-xs text-slate-500">Student • CS Dept</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[1px]">
                  <div className="h-full w-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                    <User className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onLogout} className="text-slate-400 hover:text-red-400 hover:bg-slate-800">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Good Morning, {firstName}</h1>
            <p className="text-slate-400 mt-1">Ready to ace your exams today?</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-2">
              Session ID: <span className="font-mono text-purple-400">8F-29A1</span>
            </span>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upcoming Exam Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="relative overflow-hidden border-purple-500/30 bg-gradient-to-br from-cyan-950/30 to-slate-900/50 shadow-xl shadow-purple-900/10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <CardHeader className="relative z-10 flex flex-row items-start justify-between border-b border-purple-500/10 pb-6">
                  <div>
                    <Badge className="mb-3 bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20">Upcoming Examination</Badge>
                    <CardTitle className="text-2xl mb-1 text-white">Advanced AI Algorithms</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-slate-400">
                      <span className="font-mono text-purple-300 bg-purple-500/10 px-1.5 rounded border border-purple-500/20">CS-405</span>
                      <span>•</span>
                      <span>End Semester Exam</span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white font-mono tracking-tight">02:30:00</div>
                    <div className="text-xs text-purple-400 font-medium tracking-wide uppercase mt-1">Duration</div>
                  </div>
                </CardHeader>
                
                <CardContent className="relative z-10 pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Date</p>
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <CalendarIcon className="h-4 w-4 text-purple-400" />
                        Feb 16, 2026
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Time</p>
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <Clock className="h-4 w-4 text-purple-400" />
                        10:00 AM
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Marks</p>
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <Trophy className="h-4 w-4 text-purple-400" />
                        100 Points
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Mode</p>
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <AlertTriangle className="h-4 w-4 text-purple-400" />
                        Strict AI
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/30 rounded-xl p-4 border border-purple-500/10">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                        <BookOpen className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="text-sm">
                        <p className="text-white font-medium">Instructions</p>
                        <p className="text-slate-400 text-xs">Webcam and microphone access required.</p>
                      </div>
                    </div>
                    <Button onClick={onStartExam} className="w-full sm:w-auto px-8 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:brightness-110 text-white shadow-lg shadow-fuchsia-900/40 border-none">

                      Start Examination
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-slate-800 bg-slate-900/40">
                <CardHeader>
                  <CardTitle className="text-white">Performance Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45}/>
  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
</linearGradient>

                      </defs>
                      <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#e879f9' }}

                      />
                      <Area type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />

                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-8">
            
           <Card className="border-slate-800 bg-slate-900/40">
  <CardContent className="p-6">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="w-full"
    />
  </CardContent>
</Card>


            
            

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">Taken</span>
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-xs text-purple-300 mt-1">+2 this month</div>
              </Card>
              <Card className="p-4 bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">Avg</span>
                <div className="text-2xl font-bold text-white">88%</div>
                <div className="text-xs text-purple-400 mt-1">Top 5% of class</div>
              </Card>
            </div>

            {/* Schedule List (Simplified below calendar) */}
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-white">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-start relative pb-6 border-l border-purple-500/20 pl-6 last:border-0 last:pb-0">
                  <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Advanced AI Algorithms</p>
                    <p className="text-xs text-purple-400 mt-0.5">Today, 10:00 AM</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start relative pb-6 border-l border-slate-700 pl-6 last:border-0 last:pb-0">
                  <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-300">Distributed Systems</p>
                    <p className="text-xs text-slate-500 mt-0.5">Feb 20, 02:00 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold border border-purple-500/20">{initials}</div>
                <div>
                  <div className="text-sm font-medium text-white">{studentName}</div>
                  <div className="text-xs text-slate-500">REG-2024-001</div>
                </div>
                <div className="ml-auto">
                   <Settings className="h-4 w-4 text-slate-500 hover:text-white cursor-pointer" />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
};