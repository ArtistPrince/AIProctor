import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types';

interface RequireAuthProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const roleDefaultRoute: Record<UserRole, string> = {
  super_admin: '/admin',
  institute_admin: '/admin',
  exam_admin: '/exam-admin',
  proctor: '/proctor',
  student: '/student',
};

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleLogout = () => {
      // Redirect to login when custom logout event is fired
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [navigate]);

  if (!isAuthenticated || !user) {
    return null; // Return null and let router redirect
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md w-full glass-surface rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Unauthorized</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account does not have permission to view this page.
          </p>
          <button
            onClick={() => navigate(roleDefaultRoute[user.role])}
            className="inline-flex items-center justify-center h-9 px-4 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { roleDefaultRoute };
