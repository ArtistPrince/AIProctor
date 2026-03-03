import React, { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, Play } from 'lucide-react';
import { Exam } from '@/types';
import { useNavigate } from 'react-router-dom';
import { listExams } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

const MyExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: exams = [], error } = useQuery({
    queryKey: ['exams', 'faculty'],
    queryFn: listExams,
  });

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load exams', description: (error as Error).message, variant: 'destructive' });
    }
  }, [error, toast]);

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'batches', label: 'Batches', render: (e: Exam) => `${e.batches.length} batch(es)` },
    { key: 'startDate', label: 'Date', render: (e: Exam) => new Date(e.startDate).toLocaleDateString() },
    { key: 'duration', label: 'Duration', render: (e: Exam) => `${e.duration} min` },
    { key: 'status', label: 'Status', render: (e: Exam) => <StatusBadge status={e.status} /> },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="My Exams" subtitle="All created and assigned exams" breadcrumbs={[{ label: 'Dashboard', path: '/faculty' }, { label: 'My Exams' }]} />
      <DataTable data={exams as unknown as Record<string, unknown>[]} columns={columns as any}
        actions={(item: any) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" disabled={item.status === 'live' || item.status === 'completed'}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" disabled={item.status === 'live' || item.status === 'completed'}><Trash2 className="h-4 w-4" /></Button>
            {item.status === 'live' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/proctoring')} className="text-success"><Play className="h-4 w-4" /></Button>
            )}
          </div>
        )}
      />
    </DashboardLayout>
  );
};

export default MyExamsPage;
