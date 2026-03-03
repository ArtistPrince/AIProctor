import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { UserRole } from '@/types';

const roleRoutes: Record<UserRole, string> = {
  super_admin: '/super-admin',
  institute_admin: '/institute',
  faculty: '/faculty',
  student: '/student',
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const authenticatedUser = await login(email, password);
      navigate(roleRoutes[authenticatedUser.role]);
    } catch (error) {
      toast({ title: 'Login failed', description: (error as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-lg text-center space-y-6">
          <div className="inline-flex items-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-accent" />
            <span className="text-4xl font-bold text-primary-foreground tracking-tight">ProctorX</span>
          </div>
          <h2 className="text-2xl font-semibold text-primary-foreground/90">AI-Powered Exam Proctoring</h2>
          <p className="text-primary-foreground/60 text-lg leading-relaxed">
            Enterprise-grade proctoring platform with real-time AI monitoring, violation detection, and comprehensive analytics.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-8">
            {[{ val: '50K+', label: 'Students' }, { val: '99.9%', label: 'Uptime' }, { val: '< 1s', label: 'Detection' }].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-accent">{s.val}</p>
                <p className="text-xs text-primary-foreground/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
              <Shield className="h-8 w-8 text-accent" />
              <span className="text-2xl font-bold">ProctorX</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Sign In</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
