import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProctoringSession } from '@/types';
import { Wifi, WifiOff, User, AlertTriangle, X, Filter } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { listProctoringSessions } from '@/lib/backendApi';

const riskColors: Record<string, string> = {
  low: 'border-success/30 bg-success/5',
  medium: 'border-warning/30 bg-warning/5',
  high: 'border-destructive/30 bg-destructive/5',
  critical: 'border-destructive/50 bg-destructive/10',
};

const ProctoringPage: React.FC = () => {
  const [selected, setSelected] = useState<ProctoringSession | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [remark, setRemark] = useState('');
  const { data: sessions = [] } = useQuery({ queryKey: ['proctoring', 'sessions'], queryFn: listProctoringSessions });

  const filtered = filter === 'all' ? sessions
    : filter === 'high-risk' ? sessions.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical')
    : sessions.filter(s => s.status === filter);

  return (
    <DashboardLayout>
      <PageHeader title="Live Proctoring" subtitle="Database Systems Quiz — Real-time monitoring" breadcrumbs={[{ label: 'Dashboard', path: '/faculty' }, { label: 'Proctoring' }]}
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="high-risk">High Risk Only</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((session) => (
          <div
            key={session.studentId}
            onClick={() => setSelected(session)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-card-hover ${riskColors[session.riskLevel]}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{session.studentName}</p>
                  <StatusBadge status={session.status} />
                </div>
              </div>
              <StatusBadge status={session.riskLevel} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Face: {session.faceDetected ? '✓ Detected' : '✗ Not detected'}</span>
                {session.networkStrength === 'strong' ? <Wifi className="h-3.5 w-3.5 text-success" /> : <WifiOff className="h-3.5 w-3.5 text-destructive" />}
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{session.progress}%</span>
                </div>
                <Progress value={session.progress} className="h-1.5" />
              </div>
              {session.violations.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3 w-3" />{session.violations.length} violation(s)
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.studentName}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 p-3 rounded-lg"><p className="text-muted-foreground text-xs">Status</p><StatusBadge status={selected.status} /></div>
                <div className="bg-muted/50 p-3 rounded-lg"><p className="text-muted-foreground text-xs">Risk Level</p><StatusBadge status={selected.riskLevel} /></div>
                <div className="bg-muted/50 p-3 rounded-lg"><p className="text-muted-foreground text-xs">Face</p><p className="font-medium">{selected.faceDetected ? 'Detected' : 'Not Detected'}</p></div>
                <div className="bg-muted/50 p-3 rounded-lg"><p className="text-muted-foreground text-xs">Network</p><p className="font-medium capitalize">{selected.networkStrength}</p></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Violation Timeline</h4>
                {selected.violations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No violations recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selected.violations.map(v => (
                      <div key={v.id} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">{v.type}</span>
                          <span className="text-xs text-muted-foreground">{v.timestamp}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{v.description}</p>
                        <StatusBadge status={v.severity} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Add Remark</h4>
                <Textarea placeholder="Enter proctor remark..." value={remark} onChange={e => setRemark(e.target.value)} className="mb-2" />
                <Button size="sm" className="bg-accent text-accent-foreground">Save Remark</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default ProctoringPage;
