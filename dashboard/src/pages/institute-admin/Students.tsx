import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createUser, importStudents, listBatches, listUsers, updateStudent } from '@/lib/backendApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getCsvValue, parseCsv } from '@/lib/csv';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', enrollmentNo: '', batchName: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', enrollmentNo: '', batchName: '' });
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
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

  const findBatchByInput = (rawValue: string) => {
    const value = rawValue.trim().toLowerCase();
    if (!value) return (batches || [])[0];

    return (batches || []).find((batch) =>
      [batch.id, batch.name, batch.department].some((field) => field.toLowerCase() === value)
    );
  };

  const handleAdd = async () => {
    if (!form.name || !form.email) { toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' }); return; }
    try {
      const matchedBatch = findBatchByInput(form.batchName);

      if (!matchedBatch) {
        toast({ title: 'No batch found', description: 'Create a batch first', variant: 'destructive' });
        return;
      }

      await createUser({
        instituteId: user?.instituteId,
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

  const downloadTemplate = () => {
    const template = 'name,email,batch_code,section,roll_no,password\nJohn Student,john.student@institute.edu,NOVA01-CSE-2026,A,1001,ChangeMe@123\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportStudents = () => {
    const headers = ['name', 'email', 'enrollment_no', 'batch', 'status'];
    const rows = students.map((s) => [s.name, s.email, s.enrollmentNo, s.batchName, s.status].join(','));
    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImportingCsv(true);
      const content = await file.text();
      const rows = parseCsv(content);
      if (!rows.length) {
        toast({ title: 'Import denied', description: 'CSV has no data rows.', variant: 'destructive' });
        return;
      }

      const normalized = rows.map((row, index) => ({
        index: index + 1,
        name: getCsvValue(row, ['name', 'full name']),
        email: getCsvValue(row, ['email']).toLowerCase(),
        batchCode: getCsvValue(row, ['batch_code', 'batch']),
        batchId: getCsvValue(row, ['batch_id']),
        section: getCsvValue(row, ['section']).toUpperCase(),
        rollNo: getCsvValue(row, ['roll_no', 'rollno', 'enrollment_no']).toUpperCase(),
        password: getCsvValue(row, ['password']) || 'ChangeMe@123',
      }));

      const errors: string[] = [];
      const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
      const seenEmail = new Set<string>();
      const seenRoll = new Set<string>();

      normalized.forEach((row) => {
        if (!row.name) errors.push(`Row ${row.index}: name is required`);
        if (!row.email) errors.push(`Row ${row.index}: email is required`);
        else if (!emailPattern.test(row.email)) errors.push(`Row ${row.index}: invalid email format`);
        if (!row.batchCode && !row.batchId) errors.push(`Row ${row.index}: batch_code or batch_id is required`);
        if (!row.section) errors.push(`Row ${row.index}: section is required`);
        if (!row.rollNo) errors.push(`Row ${row.index}: roll_no is required`);
        if (!row.password || row.password.length < 8) errors.push(`Row ${row.index}: password must be at least 8 characters`);

        if (row.email) {
          if (seenEmail.has(row.email)) errors.push(`Row ${row.index}: duplicate email in file (${row.email})`);
          seenEmail.add(row.email);
        }
        const rollKey = `${row.batchId || row.batchCode}:${row.section}:${row.rollNo}`;
        if (seenRoll.has(rollKey)) errors.push(`Row ${row.index}: duplicate batch+section+roll_no in file (${row.section}, ${row.rollNo})`);
        seenRoll.add(rollKey);
      });

      if (errors.length) {
        toast({
          title: 'Import denied',
          description: errors.slice(0, 3).join(' • ') + (errors.length > 3 ? ` • +${errors.length - 3} more` : ''),
          variant: 'destructive',
        });
        return;
      }

      const result = await importStudents(normalized.map((row) => ({
        name: row.name,
        email: row.email,
        batchCode: row.batchCode || undefined,
        batchId: row.batchId || undefined,
        section: row.section,
        rollNo: row.rollNo,
        password: row.password || undefined,
      })));

      await queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Import completed', description: `${result.created} student record(s) created.` });
    } catch (error) {
      toast({ title: 'Import denied', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setImportingCsv(false);
    }
  };

  const handleDelete = (id: string) => { setStudents(prev => prev.filter(s => s.id !== id)); toast({ title: 'Deleted' }); };

  const openEdit = (item: Student) => {
    setEditingStudentId(item.id);
    setEditForm({
      name: item.name,
      email: item.email,
      enrollmentNo: item.enrollmentNo,
      batchName: item.batchName,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingStudentId) return;
    if (!editForm.name || !editForm.email) {
      toast({ title: 'Error', description: 'Name and email are required', variant: 'destructive' });
      return;
    }

    const matchedBatch = findBatchByInput(editForm.batchName);
    if (!matchedBatch) {
      toast({ title: 'No batch found', description: 'Create a batch first', variant: 'destructive' });
      return;
    }

    try {
      await updateStudent(editingStudentId, {
        name: editForm.name,
        email: editForm.email,
        batchId: matchedBatch.id,
        section: 'A',
        rollNo: editForm.enrollmentNo || Date.now().toString().slice(-6),
      });

      setStudents((prev) => prev.map((item) => (
        item.id === editingStudentId
          ? {
              ...item,
              name: editForm.name,
              email: editForm.email,
              enrollmentNo: editForm.enrollmentNo,
              batchId: matchedBatch.id,
              batchName: matchedBatch.name,
            }
          : item
      )));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditOpen(false);
      setEditingStudentId(null);
      toast({ title: 'Student Updated' });
    } catch (error) {
      toast({ title: 'Failed to update student', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const columns = [
    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'enrollmentNo', label: 'Enrollment No' }, { key: 'batchName', label: 'Batch' },
    { key: 'status', label: 'Status', render: (s: Student) => <StatusBadge status={s.status} /> },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Students" subtitle="Manage student records" breadcrumbs={[{ label: 'Dashboard', path: '/institute' }, { label: 'Students' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportStudents}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Add Student</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setAddOpen(true)}>Manual Entry</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Import CSV</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={downloadTemplate}><Download className="h-4 w-4 mr-2" />Get Template</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => csvInputRef.current?.click()} disabled={importingCsv}><Upload className="h-4 w-4 mr-2" />{importingCsv ? 'Importing...' : 'Import'}</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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

      <DataTable data={students as unknown as Record<string, unknown>[]} columns={columns as any} importable={false} exportable={false}
        actions={(item: any) => (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => openEdit(item as Student)}><Pencil className="h-4 w-4" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Student?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Full Name *" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            <Input placeholder="Email *" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
            <Input placeholder="Enrollment No" value={editForm.enrollmentNo} onChange={e => setEditForm({ ...editForm, enrollmentNo: e.target.value })} />
            <Input placeholder="Batch" value={editForm.batchName} onChange={e => setEditForm({ ...editForm, batchName: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="bg-accent text-accent-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StudentsPage;
