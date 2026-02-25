import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import { Bell, BookOpen, Calendar as CalendarIcon, Clock, LogOut, Settings, Trophy, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Assignment {
  id: string;
  exam_id: string;
  batch_id?: string | null;
  student_id?: string | null;
  exam: {
    id: string;
    title: string;
    duration: number;
    start_time?: string | null;
    end_time?: string | null;
  };
}

const performanceData = [
  { name: 'Ex 1', score: 65 },
  { name: 'Ex 2', score: 75 },
  { name: 'Ex 3', score: 85 },
  { name: 'Ex 4', score: 78 },
  { name: 'Ex 5', score: 90 },
  { name: 'Ex 6', score: 88 },
];

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    fetchAssignments();
  }, []);

  const firstName = useMemo(() => user?.name?.split(' ')[0] || 'Student', [user?.name]);
  const initials = useMemo(() => {
    const base = user?.name || user?.email || 'Student';
    return base
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [user?.name, user?.email]);

  const nextAssignment = useMemo(() => {
    if (!assignments.length) return null;
    const sorted = [...assignments].sort((a, b) => {
      const aTime = a.exam.start_time ? new Date(a.exam.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.exam.start_time ? new Date(b.exam.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    return sorted[0];
  }, [assignments]);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments/me');
      setAssignments(res.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight text-foreground">
              KNOWBOTS <span className="text-primary">LMS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground mr-3">
              <Link to="/student" className="text-foreground hover:text-primary transition-colors">Dashboard</Link>
              <Link to="/student/exams" className="hover:text-primary transition-colors">Exams</Link>
              <Link to="/student/results" className="hover:text-primary transition-colors">Results</Link>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-secondary">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border border-background" />
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name || user?.email || 'Student'}</p>
              <p className="text-xs text-muted-foreground">Student</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px]">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-secondary">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Good Morning, {firstName}</h1>
            <p className="text-muted-foreground mt-1">Ready to ace your exams today?</p>
          </div>
          <span className="text-sm text-muted-foreground bg-card px-3 py-1 rounded-full border border-border flex items-center gap-2">
            Student ID: <span className="font-mono text-primary">{user?.id || 'N/A'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="relative overflow-hidden border-border bg-card card-shadow-md">
                <CardHeader className="relative z-10 flex flex-row items-start justify-between border-b border-border pb-6">
                  <div>
                    <Badge className="mb-3 bg-secondary text-secondary-foreground border-border hover:bg-secondary">
                      Upcoming Examination
                    </Badge>
                    <CardTitle className="text-2xl mb-1 text-foreground">{nextAssignment?.exam.title || 'No exam assigned'}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono text-primary bg-secondary px-1.5 rounded border border-border">
                        {nextAssignment?.exam.id || '---'}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground font-mono tracking-tight">
                      {nextAssignment ? `${nextAssignment.exam.duration}:00` : '00:00'}
                    </div>
                    <div className="text-xs text-primary font-medium tracking-wide uppercase mt-1">Duration</div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 pt-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date</p>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {nextAssignment?.exam.start_time ? new Date(nextAssignment.exam.start_time).toLocaleDateString() : 'TBA'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Time</p>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Clock className="h-4 w-4 text-primary" />
                        {nextAssignment?.exam.start_time ? new Date(nextAssignment.exam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned</p>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Trophy className="h-4 w-4 text-primary" />
                        {assignments.length} Exams
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mode</p>
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Strict AI
                      </div>
                    </div>
                  </div>

                  {nextAssignment ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary rounded-xl p-4 border border-border">
                      <div className="text-sm">
                        <p className="text-foreground font-medium">Instructions</p>
                        <p className="text-muted-foreground text-xs">Webcam and microphone access required.</p>
                      </div>
                      <Link
                        to={`/exam/${nextAssignment.exam.id}/live`}
                        className="w-full sm:w-auto px-8 py-2 rounded-md bg-primary hover:opacity-90 text-primary-foreground text-sm font-medium text-center"
                      >
                        Start Examination
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
                      No exams assigned yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <Card className="border-border bg-card card-shadow">
              <CardHeader>
                <CardTitle className="text-foreground">All Assigned Exams</CardTitle>
                <CardDescription>View all exams assigned to you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">No exams assigned yet.</p>
                ) : (
                  assignments.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to={`/exam/${assignment.exam.id}/live`}
                      className="flex items-start justify-between p-3 rounded-lg border border-border hover:border-primary hover:bg-secondary transition-all group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{assignment.exam.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assignment.exam.start_time ? new Date(assignment.exam.start_time).toLocaleString() : 'Time not set'} • {assignment.exam.duration} min
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card card-shadow">
              <CardHeader>
                <CardTitle className="text-foreground">Performance Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} itemStyle={{ color: 'hsl(var(--primary))' }} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-border bg-card card-shadow">
              <CardContent className="p-6">
                <Calendar mode="single" selected={date} onSelect={setDate} className="w-full" />
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-card border-border card-shadow">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Assigned</span>
                <div className="text-2xl font-bold text-foreground">{assignments.length}</div>
                <div className="text-xs text-primary mt-1">Current exams</div>
              </Card>
              <Card className="p-4 bg-card border-border card-shadow">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Status</span>
                <div className="text-2xl font-bold text-foreground">{loading ? '...' : 'Live'}</div>
                <div className="text-xs text-primary mt-1">Dashboard connected</div>
              </Card>
            </div>

            <Card className="border-border bg-card card-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignments.slice(0, 3).map((assignment) => (
                  <div key={assignment.id} className="flex gap-4 items-start relative pb-5 border-l border-border pl-6 last:border-0 last:pb-0">
                    <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{assignment.exam.title}</p>
                      <p className="text-xs text-primary mt-0.5">
                        {assignment.exam.start_time ? new Date(assignment.exam.start_time).toLocaleString() : 'Time not set'}
                      </p>
                    </div>
                  </div>
                ))}
                {!assignments.length && <p className="text-xs text-muted-foreground">No upcoming events</p>}
              </CardContent>
            </Card>

            <Card className="bg-card border-border card-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-primary font-bold border border-border">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{user?.name || user?.email || 'Student'}</div>
                  <div className="text-xs text-muted-foreground">{user?.id || 'N/A'}</div>
                </div>
                <div className="ml-auto">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {loading && (
        <div className="fixed bottom-4 right-4 rounded-md bg-card border border-border px-3 py-2 text-xs text-muted-foreground card-shadow">
          Loading exams...
        </div>
      )}
      </div>
  );
}
