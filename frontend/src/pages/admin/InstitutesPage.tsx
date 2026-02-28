import { Building2, Search, Plus, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

interface Institute {
  id: string;
  institute_code: string;
  name: string;
  address?: string | null;
  contact_email?: string | null;
}

interface User {
  id: string;
  email: string;
  role: string;
  institute_id?: string | null;
}

const codeStyle = 'bg-secondary text-muted-foreground border border-border';

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [instRes, usersRes] = await Promise.all([
          api.get('/institutes/'),
          api.get('/users/'),
        ]);
        setInstitutes(instRes.data || []);
        setUsers(usersRes.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users
      .filter((user) => user.role === 'student' && user.institute_id != null)
      .forEach((user) => {
        const key = String(user.institute_id);
        counts[key] = (counts[key] || 0) + 1;
      });
    return counts;
  }, [users]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Administration</p>
          <h1 className="text-2xl font-bold text-foreground">Institutes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage registered institutions and their subscriptions</p>
        </div>
        <button className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition">
          <Plus className="h-4 w-4" /> Add Institute
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search institutes..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
          <span className="text-xs text-muted-foreground">{institutes.length} institutes</span>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {['Institution', 'Code', 'Students', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-sm text-muted-foreground" colSpan={4}>
                  Loading institutes...
                </td>
              </tr>
            ) : institutes.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-muted-foreground" colSpan={4}>
                  No institutes found.
                </td>
              </tr>
            ) : institutes.map((inst) => (
              <tr
                key={inst.id}
                className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{inst.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${codeStyle}`}>
                    {inst.institute_code}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-foreground font-medium">
                  {(studentCounts[inst.id] || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3.5">
                  <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
