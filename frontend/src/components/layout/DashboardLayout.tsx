import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';

interface NavItem {
  title: string;
  href: string;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  super_admin: [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Institutes', href: '/admin/institutes' },
    { title: 'Users', href: '/admin/users' },
    { title: 'Subscriptions', href: '/admin/subscriptions' },
    { title: 'Settings', href: '/admin/settings' },
  ],
  institute_admin: [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Batches', href: '/admin/batches' },
    { title: 'Students', href: '/admin/students' },
    { title: 'Settings', href: '/admin/settings' },
  ],
  exam_admin: [
    { title: 'Dashboard', href: '/exam-admin' },
    { title: 'Create Exam', href: '/exam-admin/create' },
    { title: 'Assign Exam', href: '/exam-admin/assign' },
    { title: 'Question Bank', href: '/exam-admin/questions' },
    { title: 'Results', href: '/exam-admin/results' },
  ],
  proctor: [
    { title: 'Dashboard', href: '/proctor' },
    { title: 'Exam Monitoring', href: '/proctor/monitoring' },
    { title: 'Incident Logs', href: '/proctor/incidents' },
  ],
  student: [
    { title: 'Dashboard', href: '/student' },
    { title: 'My Exams', href: '/student/exams' },
    { title: 'Results', href: '/student/results' },
  ],
};

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return null;
  }

  const navItems = roleNavItems[user.role] || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight text-foreground">KNOWBOTS <span className="text-primary">LMS</span></div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground mr-3">
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
                    className={isActive ? 'text-foreground' : 'hover:text-primary transition-colors'}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
            <Button variant="ghost" size="icon" className="rounded-full relative hover:bg-secondary">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border border-background" />
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.name || user?.email || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-accent p-[1px]">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="text-muted-foreground hover:text-destructive hover:bg-secondary"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
