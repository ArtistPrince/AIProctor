import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Eye, Pencil, Trash2, Play } from 'lucide-react';
import { Exam } from '@/types';
import { useNavigate } from 'react-router-dom';
import { listExams, updateExam } from '@/lib/backendApi';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const toDateTimeInputValue = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const MyExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', duration: '', totalMarks: '', startDate: '', endDate: '' });
  const { data: exams = [], error } = useQuery({
    queryKey: ['exams', 'faculty'],
    queryFn: listExams,
  });

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load exams', description: (error as Error).message, variant: 'destructive' });
    }
  }, [error, toast]);

  const openEdit = (item: Exam) => {
    setEditingExamId(item.id);
    setEditForm({
      title: item.title,
      duration: String(item.duration),
      totalMarks: String(item.totalMarks),
      startDate: toDateTimeInputValue(item.startDate),
      endDate: toDateTimeInputValue(item.endDate),
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingExamId) return;
    if (!editForm.title || !editForm.duration || !editForm.totalMarks) {
      toast({ title: 'Validation Error', description: 'Title, duration, and marks are required', variant: 'destructive' });
      return;
    }

    try {
      await updateExam(editingExamId, {
        title: editForm.title,
        duration: Number(editForm.duration),
        passingMarks: Number(editForm.totalMarks),
        scheduledTime: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        endTime: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['exams', 'faculty'] });
      setEditOpen(false);
      setEditingExamId(null);
      toast({ title: 'Exam Updated' });
    } catch (editError) {
      toast({ title: 'Failed to update exam', description: (editError as Error).message, variant: 'destructive' });
    }
  };

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
            <Button variant="ghost" size="sm" disabled={item.status === 'live' || item.status === 'completed'} onClick={() => openEdit(item as Exam)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" disabled={item.status === 'live' || item.status === 'completed'}><Trash2 className="h-4 w-4" /></Button>
            {item.status === 'live' && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/proctoring')} className="text-success"><Play className="h-4 w-4" /></Button>
            )}
          </div>
        )}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Exam</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            <Input placeholder="Duration (min)" type="number" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
            <Input placeholder="Passing Marks" type="number" value={editForm.totalMarks} onChange={(e) => setEditForm({ ...editForm, totalMarks: e.target.value })} />
            <Input placeholder="Start Date" type="datetime-local" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
            <Input placeholder="End Date" type="datetime-local" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyExamsPage;
