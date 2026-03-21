import React, { useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/dashboard/DataTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Plus, Upload } from 'lucide-react';
import { Batch } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { createBatch, importBatches, listBatches } from '@/lib/backendApi';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', year: '' });
  const csvInputRef = useRef<HTMLInputElement | null>(null);
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
    if (!user?.instituteId && user?.role !== 'super_admin') {
      toast({ title: 'Missing institute context', variant: 'destructive' });
      return;
    }
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

  const downloadTemplate = () => {
    const template = 'course_name,course_code,batch_year\nB.Tech CSE,CSE,2026\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batches_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBatches = () => {
    const headers = ['batch', 'department', 'year', 'students', 'exams', 'avg_score', 'risk'];
    const rows = batches.map((b) => [b.name, b.department, b.year, b.totalStudents, b.totalExams, b.avgScore, b.riskSummary].join(','));
    const content = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'batches_export.csv';
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
        courseName: getCsvValue(row, ['course_name', 'name', 'batch', 'course name']),
        courseCode: getCsvValue(row, ['course_code', 'department', 'dept', 'course code']).replace(/\s+/g, '').toUpperCase(),
        batchYear: getCsvValue(row, ['batch_year', 'year', 'academic year']),
      }));

      const errors: string[] = [];
      const seen = new Set<string>();
      normalized.forEach((row) => {
        if (!row.courseName) errors.push(`Row ${row.index}: course_name is required`);
        if (!row.courseCode) errors.push(`Row ${row.index}: course_code is required`);
        if (!row.batchYear) errors.push(`Row ${row.index}: batch_year is required`);
        if (row.courseCode && row.batchYear) {
          const key = `${row.courseCode}:${row.batchYear}`;
          if (seen.has(key)) errors.push(`Row ${row.index}: duplicate course_code + batch_year in file (${row.courseCode}, ${row.batchYear})`);
          seen.add(key);
        }
      });

      if (errors.length) {
        toast({
          title: 'Import denied',
          description: errors.slice(0, 3).join(' • ') + (errors.length > 3 ? ` • +${errors.length - 3} more` : ''),
          variant: 'destructive',
        });
        return;
      }

      const result = await importBatches(normalized.map((row) => ({ courseName: row.courseName, courseCode: row.courseCode, batchYear: row.batchYear })));
      await queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast({ title: 'Import completed', description: `${result.created} batch record(s) created.` });
    } catch (error) {
      toast({ title: 'Import denied', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setImportingCsv(false);
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportBatches}><Download className="h-4 w-4 mr-1.5" />Export CSV</Button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 mr-1.5" />Create Batch</Button>
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
              <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="Batch Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                <Input placeholder="Academic Year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAdd} className="bg-accent text-accent-foreground">Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>

      <DataTable data={batches as unknown as Record<string, unknown>[]} columns={columns as any} importable={false} exportable={false} />
    </DashboardLayout>
  );
};

export default BatchesPage;
