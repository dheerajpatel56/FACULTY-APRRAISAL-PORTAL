import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fpgpApi } from '../../api/fpgp';
import { userApi } from '../../api/users';
import toast from 'react-hot-toast';
import { BookOpen, CheckCircle2, Clock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';

export default function FPGPDepartmentPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.listAcademicYears().then((yrs) => {
      setYears(yrs);
      if (yrs.length) {
        setSelectedYear(yrs[0].label);
        loadPlans(yrs[0].label);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  const loadPlans = (label: string) => {
    setLoading(true);
    fpgpApi.getDeptPlans(label)
      .then(setPlans)
      .catch(() => toast.error('Failed to load department plans'))
      .finally(() => setLoading(false));
  };

  const onYearChange = (label: string) => {
    setSelectedYear(label);
    loadPlans(label);
  };

  const signedCount = plans.filter((p) => p.facultySignedAt).length;
  const hodSignedCount = plans.filter((p) => p.hodSignedAt).length;
  const pendingHod = plans.filter((p) => p.status === 'ACTIVE' && !p.hodSignedAt).length;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Department FPGP Plans"
        subtitle="Faculty Performance Growth Plans in your department"
        breadcrumbs={[{ label: 'Home' }, { label: 'Department FPGP' }]}
        actions={
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="border border-surface-border rounded px-3 py-2 text-sm bg-surface-base"
          >
            {years.map((y) => <option key={y.id} value={y.label}>{y.label}</option>)}
          </select>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary-50 text-primary-600">
              <BookOpen size={18} />
            </div>
            <div>
              <div className="text-xs text-ink-muted">Total Plans</div>
              <div className="text-xl font-bold text-ink-primary leading-tight">{plans.length}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-emerald-50 text-success-500">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-xs text-ink-muted">Faculty Signed</div>
              <div className="text-xl font-bold text-ink-primary leading-tight">{signedCount}</div>
              <div className="text-[10px] text-ink-subtle">HoD Signed: {hodSignedCount}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center bg-amber-50 text-warning-500">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-xs text-ink-muted">Pending HoD Sign</div>
              <div className="text-xl font-bold text-ink-primary leading-tight">{pendingHod}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Plans list */}
      {loading ? (
        <div className="text-sm text-ink-muted">Loading...</div>
      ) : plans.length === 0 ? (
        <Card className="text-center py-8">
          <BookOpen className="mx-auto text-ink-subtle mb-3" size={40} />
          <p className="text-ink-muted text-sm">No FPGP plans for {selectedYear}.</p>
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-700 text-white text-xs">
                <th className="text-left px-5 py-2.5 font-medium">Faculty</th>
                <th className="text-left px-5 py-2.5 font-medium">Code</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
                <th className="text-left px-5 py-2.5 font-medium">Faculty Signed</th>
                <th className="text-left px-5 py-2.5 font-medium">HoD Signed</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {plans.map((p, i) => (
                <tr key={p.id} className={i % 2 === 1 ? 'bg-surface-muted/50' : ''}>
                  <td className="px-5 py-3 font-medium text-ink-primary">{p.user?.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-secondary">{p.user?.employeeCode}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-ink-muted">
                    {p.facultySignedAt ? (
                      <span className="flex items-center gap-1 text-success-500">
                        <CheckCircle2 size={12} /> {new Date(p.facultySignedAt).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-ink-muted">
                    {p.hodSignedAt ? (
                      <span className="flex items-center gap-1 text-success-500">
                        <CheckCircle2 size={12} /> {new Date(p.hodSignedAt).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      to={`/fpgp/${p.id}`}
                      className="text-sm bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 inline-block"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
