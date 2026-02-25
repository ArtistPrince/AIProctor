import { StatCard } from '@/components/ui/stat-card';
import { Building2, Users, ClipboardList, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ExamSession {
  id: number;
  status: string;
}

interface Exam {
  id: number;
}

interface User {
  id: number;
}

interface Institute {
  id: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [instRes, usersRes, examsRes, sessionsRes] = await Promise.all([
        api.get('/institutes/').catch(() => ({ data: [] })),
        api.get('/users/').catch(() => ({ data: [] })),
        api.get('/exams/').catch(() => ({ data: [] })),
        api.get('/sessions/').catch(() => ({ data: [] })),
      ]);
      setInstitutes(instRes.data || []);
      setUsers(usersRes.data || []);
      setExams(examsRes.data || []);
      setSessions(sessionsRes.data || []);
    };
    fetchData();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
          {isSuperAdmin ? 'Super Admin' : 'Institute Admin'}
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          {isSuperAdmin ? 'Platform Overview' : 'Institute Dashboard'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {isSuperAdmin && (
          <StatCard
            title="Total Institutes"
            value={institutes.length}
            icon={Building2}
            accent="bg-violet-100"
          />
        )}
        <StatCard title="Active Users" value={users.length} icon={Users} accent="bg-blue-100" />
        <StatCard title="Total Exams" value={exams.length} icon={ClipboardList} accent="bg-emerald-100" />
        <StatCard title="Proctoring Sessions" value={sessions.length} icon={Shield} accent="bg-indigo-100" />
      </div>
    </div>
  );
}
