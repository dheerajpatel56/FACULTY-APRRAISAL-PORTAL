import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi } from '../../api/reports';
import { userApi } from '../../api/users';
import toast from 'react-hot-toast';
import { Users, CheckCircle2, Clock, TrendingUp, Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatTile from '../../components/StatTile';
import StatusBadge from '../../components/StatusBadge';

export default function DeptReportsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [yearFilter, setYearFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    userApi.listAcademicYears().then(setYears).catch(() => {});
    load('');
  }, []);

  const load = (yearLabel: string) => {
    setLoading(true);
    reportApi.getDeptReport(yearLabel ? { year: yearLabel } : {})
      .then(setReviews)
      .catch(() => toast.error('Failed to load department report'))
      .finally(() => setLoading(false));
  };

  const onYearChange = (label: string) => {
    setYearFilter(label);
    load(label);
  };

  const stats = useMemo(() => {
    const total = reviews.length;
    const approved = reviews.filter((r) => r.status === 'APPROVED').length;
    const rejected = reviews.filter((r) => r.status === 'REJECTED').length;
    const pending = total - approved - rejected;
    const grandTotals = reviews.map((r) => r.grandTotal).filter((v) => typeof v === 'number');
    const avgScore = grandTotals.length ? (grandTotals.reduce((a, b) => a + b, 0) / grandTotals.length) : 0;
    return { total, approved, rejected, pending, avgScore };
  }, [reviews]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await reportApi.exportReport({ format: 'excel', year: yearFilter || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dept-appraisals-${yearFilter || 'all'}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Department Reports"
        subtitle="Reviewed appraisals in your department"
        breadcrumbs={[{ label: 'Home' }, { label: 'Department Reports' }]}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={yearFilter}
              onChange={(e) => onYearChange(e.target.value)}
              className="border border-surface-border rounded px-3 py-2 text-sm bg-surface-base"
            >
              <option value="">All Years</option>
              {years.map((y) => <option key={y.id} value={y.label}>{y.label}</option>)}
            </select>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              <Download size={14} /> {exporting ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatTile icon={<Users size={18} />} label="Reviewed" value={stats.total} color="primary" />
        <StatTile icon={<CheckCircle2 size={18} />} label="Approved" value={stats.approved} hint={`${stats.total ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}%`} color="success" />
        <StatTile icon={<Clock size={18} />} label="Pending Decision" value={stats.pending} color="warning" />
        <StatTile icon={<TrendingUp size={18} />} label="Avg Grand Total" value={stats.avgScore.toFixed(1)} hint="/ 550" color="accent" />
      </div>

      {loading ? (
        <div className="text-sm text-ink-muted">Loading...</div>
      ) : reviews.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-ink-muted text-sm">No reviewed appraisals yet.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="px-5 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-ink-primary">Faculty-wise Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-700 text-white text-xs">
                <th className="text-left px-4 py-2.5 font-medium">Faculty</th>
                <th className="text-left px-4 py-2.5 font-medium">Code</th>
                <th className="text-left px-4 py-2.5 font-medium">Year</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Self Total</th>
                <th className="text-left px-4 py-2.5 font-medium">Cat 6</th>
                <th className="text-left px-4 py-2.5 font-medium">Grand Total</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {reviews.map((r, i) => {
                const cat6 = (r.cat6Punctuality ?? 0) + (r.cat6Professionalism ?? 0) + (r.cat6Willingness ?? 0) + (r.cat6Cordiality ?? 0) + (r.cat6Classroom ?? 0);
                return (
                  <tr key={r.id} className={i % 2 === 1 ? 'bg-surface-muted/50' : ''}>
                    <td className="px-4 py-2.5 font-medium text-ink-primary">{r.submission?.user?.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-secondary">{r.submission?.user?.employeeCode}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{r.submission?.academicYear?.label}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-ink-secondary">{r.totalScore?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-ink-secondary">{cat6.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-primary-700 font-semibold">{r.grandTotal?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/appraisal/${r.submissionId}`}
                        className="text-xs text-primary-600 hover:underline font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
