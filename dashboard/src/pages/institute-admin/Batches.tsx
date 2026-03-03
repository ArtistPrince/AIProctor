import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Batch } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createBatch, listBatches } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', year: '' });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['batches'],
    queryFn: listBatches,
  });

  useEffect(() => {
    if (data) {
      setBatches(data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load batches', description: (error as Error).message, variant: 'destructive' });
    }
  }, [error, toast]);

  const handleAdd = async () => {
    if (!form.name) { toast({ title: 'Error', description: 'Name required', variant: 'destructive' }); return; }
    try {
      const created = await createBatch({
        instituteId: user?.instituteId,
        courseCode: (form.department || form.name).replace(/\s+/g, '').slice(0, 10).toUpperCase(),
        batchYear: form.year || `${new Date().getFullYear()}`,
        courseName: form.name,
      });
      setBatches((prev) => [created, ...prev]);
      queryClient.setQueryData<Batch[]>(['batches'], (prev = []) => [created, ...prev]);
      setForm({ name: '', department: '', year: '' });
      setAddOpen(false);
      toast({ title: 'Batch Created' });
    } catch (error) {
      toast({ title: 'Failed to create batch', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const columns = [
    { key: 'name', label: 'Batch' }, { key: 'department', label: 'Department' }, { key: 'year', label: 'Year' },
    { key: 'totalStudents', label: 'Students' }, { key: 'totalExams', label: 'Exams' },
    { key: 'avgScore', label: 'Avg Score', render: (b: Batch) => <span className="font-semibold">{b.avgScore}%</span> },
    { key: 'riskSummary', label: 'Risk', render: (b: Batch) => <StatusBadge status={b.riskSummary} /> },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Batches" subtitle="Academic batch management" breadcrumbs={[{ label: 'Dashboard', path: '/institute' }, { label: 'Batches' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Create Batch</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Batch Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                <Input placeholder="Academic Year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAdd} className="bg-accent text-accent-foreground">Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable data={batches as unknown as Record<string, unknown>[]} columns={columns as any} />
    </DashboardLayout>
  );
};

export default BatchesPage;
