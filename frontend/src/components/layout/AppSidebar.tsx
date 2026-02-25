import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';
import {
  Building2,
  Users,
  Layers,
  FilePlus,
  BookOpen,
  BarChart3,
  Monitor,
  AlertTriangle,
  ClipboardList,
  Trophy,
  Shield,
  LogOut,
  LayoutDashboard,
  Settings,
  CreditCard,
  ChevronRight,
  Send,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  super_admin: [
    { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { title: 'Institutes', href: '/admin/institutes', icon: Building2 },
    { title: 'Users', href: '/admin/users', icon: Users },
    { title: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  institute_admin: [
    { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { title: 'Batches', href: '/admin/batches', icon: Layers },
    { title: 'Students', href: '/admin/students', icon: Users },
    { title: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  exam_admin: [
    { title: 'Dashboard', href: '/exam-admin', icon: LayoutDashboard },
    { title: 'Create Exam', href: '/exam-admin/create', icon: FilePlus },
    { title: 'Assign Exam', href: '/exam-admin/assign', icon: Send },
    { title: 'Question Bank', href: '/exam-admin/questions', icon: BookOpen },
    { title: 'Results', href: '/exam-admin/results', icon: BarChart3 },
  ],
  proctor: [
    { title: 'Dashboard', href: '/proctor', icon: LayoutDashboard },
    { title: 'Live Monitoring', href: '/proctor/live', icon: Monitor },
    { title: 'Incident Logs', href: '/proctor/incidents', icon: AlertTriangle },
  ],
  student: [
    { title: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { title: 'My Exams', href: '/student/exams', icon: ClipboardList },
    { title: 'Results', href: '/student/results', icon: Trophy },
  ],
};

const roleBadgeLabel: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  institute_admin: 'Institute Admin',
  exam_admin: 'Exam Admin',
  proctor: 'Proctor',
  student: 'Student',
};

const roleAvatarColor: Record<UserRole, string> = {
  super_admin: 'bg-violet-100 text-violet-700',
  institute_admin: 'bg-blue-100 text-blue-700',
  exam_admin: 'bg-emerald-100 text-emerald-700',
  proctor: 'bg-amber-100 text-amber-700',
  student: 'bg-rose-100 text-rose-700',
};

export function AppSidebar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = roleNavItems[user.role];

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-card border-r border-border">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-4.5 w-4.5 text-white" style={{ height: '18px', width: '18px' }} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground" style={{ fontFamily: 'Lato, sans-serif' }}>
              KNOWBOTS
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">LMS Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/admin' &&
              item.href !== '/exam-admin' &&
              item.href !== '/proctor' &&
              item.href !== '/student' &&
              location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon
                className={`h-4 w-4 flex-shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              />
              <span className="flex-1">{item.title}</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary">
          <div className="h-8 w-8 rounded-full bg-secondary text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{roleBadgeLabel[user.role]}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
