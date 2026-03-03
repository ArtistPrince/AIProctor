import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Faculty } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { createFaculty, listFaculties } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const FacultiesPage: React.FC = () => {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', department: '', designation: '' });
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['faculties'],
    queryFn: listFaculties,
  });

  useEffect(() => {
    if (data) {
      setFaculties(data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load faculties', description: (error as Error).message, variant: 'destructive' });
    }
  }, [error, toast]);

  const handleAdd = async () => {
    if (!form.name || !form.email) { toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' }); return; }
    if (!user?.instituteId) { toast({ title: 'Missing institute context', variant: 'destructive' }); return; }
    try {
      const created = await createFaculty({
        instituteId: user.instituteId,
        name: form.name,
        email: form.email,
        deptCode: (form.department || 'GEN').replace(/\s+/g, '').slice(0, 8).toUpperCase(),
        empId: `EMP${Date.now().toString().slice(-5)}`,
      });
      setFaculties((prev) => [created, ...prev]);
      queryClient.setQueryData<Faculty[]>(['faculties'], (prev = []) => [created, ...prev]);
      setForm({ name: '', email: '', department: '', designation: '' });
      setAddOpen(false);
      toast({ title: 'Faculty Added', description: `${form.name} added successfully.` });
    } catch (error) {
      toast({ title: 'Failed to add faculty', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = (id: string) => {
    setFaculties(prev => prev.filter(f => f.id !== id));
    toast({ title: 'Deleted', description: 'Faculty removed.' });
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'status', label: 'Status', render: (f: Faculty) => <StatusBadge status={f.status} /> },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Faculties" subtitle="Manage faculty members" breadcrumbs={[{ label: 'Dashboard', path: '/institute' }, { label: 'Faculties' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Add Faculty</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Faculty</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                <Input placeholder="Designation" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} className="bg-accent text-accent-foreground">Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable data={faculties as unknown as Record<string, unknown>[]} columns={columns as any}
        actions={(item: any) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete Faculty?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      />
    </DashboardLayout>
  );
};

export default FacultiesPage;
