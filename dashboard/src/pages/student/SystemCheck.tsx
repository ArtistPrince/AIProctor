import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Camera, Mic, Wifi, Monitor, User, Check, X } from 'lucide-react';

interface CheckItem {
  id: string;
  label: string;
  icon: React.ElementType;
  required: boolean;
  status: 'pending' | 'pass' | 'fail';
}

const SystemCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<CheckItem[]>([
    { id: 'camera', label: 'Camera Access', icon: Camera, required: true, status: 'pending' },
    { id: 'mic', label: 'Microphone Access', icon: Mic, required: true, status: 'pending' },
    { id: 'network', label: 'Network Speed', icon: Wifi, required: true, status: 'pending' },
    { id: 'browser', label: 'Browser Compatibility', icon: Monitor, required: true, status: 'pending' },
    { id: 'face', label: 'Face Alignment', icon: User, required: true, status: 'pending' },
  ]);

  const runCheck = (id: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: 'pending' } : c));
    setTimeout(() => {
      setChecks(prev => prev.map(c => c.id === id ? { ...c, status: 'pass' } : c));
    }, 1000 + Math.random() * 1000);
  };

  const runAll = () => checks.forEach(c => runCheck(c.id));

  const allPassed = checks.every(c => !c.required || c.status === 'pass');

  return (
    <DashboardLayout>
      <PageHeader title="System Check" subtitle="Verify your system before starting the exam" breadcrumbs={[{ label: 'Dashboard', path: '/student' }, { label: 'Exams', path: '/student/exams' }, { label: 'System Check' }]} />

      <div className="max-w-lg mx-auto space-y-4">
        {checks.map(check => {
          const Icon = check.icon;
          return (
            <div key={check.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              check.status === 'pass' ? 'border-success/30 bg-success/5' :
              check.status === 'fail' ? 'border-destructive/30 bg-destructive/5' :
              'border-border bg-card'
            }`}>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  {check.required && <p className="text-xs text-muted-foreground">Required</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {check.status === 'pass' && <Check className="h-5 w-5 text-success" />}
                {check.status === 'fail' && <X className="h-5 w-5 text-destructive" />}
                {check.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                <Button variant="outline" size="sm" onClick={() => runCheck(check.id)}>Test</Button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={runAll} className="flex-1">Run All Checks</Button>
          <Button disabled={!allPassed} onClick={() => navigate('/student/exam-attempt')} className="flex-1 bg-success text-success-foreground hover:bg-success/90">
            Start Exam
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemCheckPage;
