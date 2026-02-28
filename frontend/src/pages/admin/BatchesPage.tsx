import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Batch {
  id: string;
  batch_code?: string;
  name: string;
  course_code: string;
  batch_year: string;
  course_name: string;
  members: string[];
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);

  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [batchYear, setBatchYear] = useState<string>(String(new Date().getFullYear()).slice(-2));
  const [batchMembers, setBatchMembers] = useState('');

  const [batchSelectId, setBatchSelectId] = useState('');
  const [batchAddMembers, setBatchAddMembers] = useState('');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const response = await api.get('/batches/');
    setBatches(response.data);
  };

  const parseIdList = (value: string) => {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const members = parseIdList(batchMembers);
    await api.post('/batches/', {
      course_name: courseName,
      course_code: courseCode,
      batch_year: String(batchYear),
      members,
    });
    setCourseName('');
    setCourseCode('');
    setBatchMembers('');
    fetchBatches();
  };

  const handleAddMembersToBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchSelectId) return;
    const members = parseIdList(batchAddMembers);
    await api.post(`/batches/${batchSelectId}/members`, members);
    setBatchAddMembers('');
    fetchBatches();
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Administration</p>
        <h1 className="text-2xl font-bold text-foreground">Batch Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Create batches and manage batch members.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Create Batch</h2>
          <form onSubmit={handleCreateBatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Course Name</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Course Code</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch Year (e.g. 26)</label>
                <input
                  className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  required
                />
              </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Member User IDs (comma-separated)</label>
              <input
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={batchMembers}
                onChange={(e) => setBatchMembers(e.target.value)}
                placeholder="PHMS-CSE-26-01-001, PHMS-CSE-26-01-002"
              />
            </div>

            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Save Batch
            </button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border card-shadow p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add Members to Batch</h2>
          <form onSubmit={handleAddMembersToBatch} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={batchSelectId}
                onChange={(e) => setBatchSelectId(e.target.value)}
                required
              >
                <option value="">Select batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.batch_code || '-'} · {batch.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Member User IDs (comma-separated)</label>
              <input
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
                value={batchAddMembers}
                onChange={(e) => setBatchAddMembers(e.target.value)}
                placeholder="PHMS-CSE-26-01-003, PHMS-CSE-26-01-004"
              />
            </div>

            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              Add Members
            </button>
          </form>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Batches</h3>
        <div className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No batches yet.</p>
          ) : (
            batches.map((batch) => (
              <div key={batch.id} className="border-b border-border/30 pb-2 last:border-0">
                <p className="text-sm font-medium text-foreground">{batch.batch_code || '-'} · {batch.course_name} ({batch.course_code}-{batch.batch_year})</p>
                <p className="text-xs text-muted-foreground">Members: {batch.members.join(', ') || 'None'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
