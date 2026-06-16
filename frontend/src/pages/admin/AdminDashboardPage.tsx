import { useEffect, useState } from 'react';
import { userApi } from '../../api/users';
import { appraisalApi } from '../../api/appraisals';
import toast from 'react-hot-toast';
import { Users, FileText, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatTile from '../../components/StatTile';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userApi.listUsers(),
      appraisalApi.list(),
    ]).then(([u, a]) => { setUsers(u); setAppraisals(a); })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-ink-muted">Loading...</div>;

  const statusCounts = appraisals.reduce((acc: any, a: any) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and recent activity"
        breadcrumbs={[{ label: 'Home' }, { label: 'Admin Dashboard' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatTile icon={<Users size={18} />} label="Total Users" value={users.length} color="primary" />
        <StatTile icon={<FileText size={18} />} label="Total Submissions" value={appraisals.length} color="accent" />
        <StatTile icon={<CheckCircle2 size={18} />} label="Approved" value={statusCounts['APPROVED'] ?? 0} color="success" />
        <StatTile icon={<Send size={18} />} label="Submitted" value={statusCounts['SUBMITTED'] ?? 0} color="primary" />
        <StatTile icon={<Clock size={18} />} label="Under Review" value={statusCounts['UNDER_REVIEW'] ?? 0} color="warning" />
        <StatTile icon={<XCircle size={18} />} label="Rejected" value={statusCounts['REJECTED'] ?? 0} color="danger" />
      </div>

      <Card padding="none">
        <div className="px-5 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-ink-primary">Recent Submissions</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-700 text-white text-xs">
              <th className="text-left px-5 py-2 font-medium">Faculty</th>
              <th className="text-left px-5 py-2 font-medium">Submission</th>
              <th className="text-left px-5 py-2 font-medium">Year</th>
              <th className="text-left px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {appraisals.slice(0, 15).map((a: any, i: number) => (
              <tr key={a.id} className={i % 2 === 1 ? 'bg-surface-muted/50' : ''}>
                <td className="px-5 py-2.5 font-medium text-ink-primary">{a.user?.name}</td>
                <td className="px-5 py-2.5 text-ink-secondary">#{a.submissionNumber}</td>
                <td className="px-5 py-2.5 text-ink-secondary">{a.academicYear?.label}</td>
                <td className="px-5 py-2.5"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {appraisals.length === 0 && (
          <div className="p-8 text-center text-ink-muted text-sm">No submissions yet.</div>
        )}
      </Card>
    </div>
  );
}
