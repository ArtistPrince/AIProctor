import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Eye, Pencil, KeyRound, Ban, CheckCircle } from 'lucide-react';
import { Institute } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createInstitute, createUser, listInstitutes } from '@/lib/backendApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const InstitutesPage: React.FC = () => {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: ['institutes'],
    queryFn: listInstitutes,
  });

  useEffect(() => {
    if (data) {
      setInstitutes(data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Failed to load institutes', description: (error as Error).message, variant: 'destructive' });
    }
  }, [error, toast]);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.adminEmail) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    try {
      const baseCode = form.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const instituteCode = `${(baseCode || 'INST').slice(0, 5)}${Date.now().toString().slice(-4)}`;
      const created = await createInstitute({
        instituteCode,
        name: form.name,
        address: form.phone,
        contactEmail: form.email,
      });

      if (form.adminName && form.adminEmail) {
        await createUser({
          instituteId: created.id,
          name: form.adminName,
          email: form.adminEmail,
          password: form.adminPassword || 'ChangeMe@123',
          role: 'institute_admin',
          empId: `ADM${Date.now().toString().slice(-4)}`,
        });
      }

      setInstitutes((prev) => [created, ...prev]);
      queryClient.setQueryData<Institute[]>(['institutes'], (prev = []) => [created, ...prev]);
      setForm({ name: '', email: '', phone: '', adminName: '', adminEmail: '', adminPassword: '' });
      setAddOpen(false);
      toast({ title: 'Institute Added', description: `${form.name} has been successfully added.` });
    } catch (error) {
      toast({ title: 'Failed to add institute', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const toggleStatus = (id: string) => {
    setInstitutes(prev => prev.map(i => i.id === id ? { ...i, status: i.status === 'active' ? 'suspended' : 'active' } : i));
    toast({ title: 'Status Updated', description: 'Institute status has been changed.' });
  };

  const columns = [
    { key: 'name', label: 'Institute Name' },
    { key: 'status', label: 'Status', render: (i: Institute) => <StatusBadge status={i.status} /> },
    { key: 'totalBatches', label: 'Batches' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'totalFaculties', label: 'Faculty' },
    { key: 'totalExams', label: 'Exams' },
    { key: 'riskScore', label: 'Risk', render: (i: Institute) => (
      <span className={`font-semibold ${i.riskScore > 20 ? 'text-destructive' : i.riskScore > 10 ? 'text-warning' : 'text-success'}`}>
        {i.riskScore}%
      </span>
    )},
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Institutes"
        subtitle="Manage all registered institutes"
        breadcrumbs={[{ label: 'Dashboard', path: '/super-admin' }, { label: 'Institutes' }]}
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Add Institute</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Institute</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Institute Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Contact Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input placeholder="Contact Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Admin Name" value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} />
                <Input placeholder="Admin Email *" type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} />
                <Input placeholder="Admin Password" type="password" value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">Add Institute</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <DataTable
        data={institutes as unknown as Record<string, unknown>[]}
        columns={columns as any}
        actions={(item: any) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm"><KeyRound className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  {item.status === 'active' ? <Ban className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                  <AlertDialogDescription>
                    {item.status === 'active' ? 'Suspend this institute? All users will lose access.' : 'Activate this institute?'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => toggleStatus(item.id)}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      />
    </DashboardLayout>
  );
};

export default InstitutesPage;
