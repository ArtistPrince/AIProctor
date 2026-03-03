import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createUser, listBatches, listUsers } from '@/lib/backendApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', enrollmentNo: '', batchName: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: listUsers,
  });
  const { data: batches, error: batchesError } = useQuery({
    queryKey: ['batches'],
    queryFn: listBatches,
  });

  useEffect(() => {
    if (!users || !batches) return;

    const batchById = batches.reduce<Record<string, string>>((acc, batch) => {
      acc[batch.id] = batch.name;
      return acc;
    }, {});

    const mapped = users
      .filter((user) => user.role === 'student')
      .map((user) => ({
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        batchId: user.batch_id || '',
        batchName: user.batch_id ? (batchById[user.batch_id] || user.batch_code || 'Unassigned') : 'Unassigned',
        enrollmentNo: user.roll_no || user.code || '',
        status: 'active' as const,
      }));

    setStudents(mapped);
  }, [users, batches]);

  useEffect(() => {
    const error = usersError || batchesError;
    if (error) {
      toast({ title: 'Failed to load students', description: (error as Error).message, variant: 'destructive' });
    }
  }, [usersError, batchesError, toast]);

  const handleAdd = async () => {
    if (!form.name || !form.email) { toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' }); return; }
    try {
      const availableBatches = batches || [];
      const matchedBatch = availableBatches.find((batch) =>
        batch.name.toLowerCase() === form.batchName.toLowerCase() ||
        batch.department.toLowerCase() === form.batchName.toLowerCase()
      ) || availableBatches[0];

      if (!matchedBatch) {
        toast({ title: 'No batch found', description: 'Create a batch first', variant: 'destructive' });
        return;
      }

      await createUser({
        batchId: matchedBatch.id,
        name: form.name,
        email: form.email,
        password: 'ChangeMe@123',
        role: 'student',
        section: 'A',
        rollNo: form.enrollmentNo || Date.now().toString().slice(-4),
      });

      const created: Student = {
        id: `new-${Date.now()}`,
        name: form.name,
        email: form.email,
        batchId: matchedBatch.id,
        batchName: matchedBatch.name,
        enrollmentNo: form.enrollmentNo,
        status: 'active',
      };
      setStudents((prev) => [created, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setForm({ name: '', email: '', enrollmentNo: '', batchName: '' });
      setAddOpen(false);
      toast({ title: 'Student Added' });
    } catch (error) {
      toast({ title: 'Failed to add student', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = (id: string) => { setStudents(prev => prev.filter(s => s.id !== id)); toast({ title: 'Deleted' }); };

  const columns = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'enrollmentNo', label: 'Enrollment No' }, { key: 'batchName', label: 'Batch' },
    { key: 'status', label: 'Status', render: (s: Student) => <StatusBadge status={s.status} /> },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="Manage student records" breadcrumbs={[{ label: 'Dashboard', path: '/institute' }, { label: 'Students' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Add Student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Enrollment No" value={form.enrollmentNo} onChange={e => setForm({ ...form, enrollmentNo: e.target.value })} />
                <Input placeholder="Batch" value={form.batchName} onChange={e => setForm({ ...form, batchName: e.target.value })} />
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAdd} className="bg-accent text-accent-foreground">Add</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable data={students as unknown as Record<string, unknown>[]} columns={columns as any}
        actions={(item: any) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Student?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      />
    </DashboardLayout>
  );
};

export default StudentsPage;
