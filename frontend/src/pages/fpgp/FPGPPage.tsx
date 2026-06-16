import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fpgpApi } from '../../api/fpgp';
import { userApi } from '../../api/users';
import toast from 'react-hot-toast';
import { Target, Plus, FileText, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';

export default function FPGPPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.listAcademicYears().then((yrs) => {
      setYears(yrs);
      if (yrs.length) {
        setSelectedYear(yrs[0].label);
        fpgpApi.getMyPlan(yrs[0].label).then(setPlan).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  const loadPlan = (label: string) => {
    setSelectedYear(label);
    setLoading(true);
    fpgpApi.getMyPlan(label).then(setPlan).catch(() => setPlan(null)).finally(() => setLoading(false));
  };

  const createPlan = async () => {
    const year = years.find((y) => y.label === selectedYear);
    if (!year) return;
    try {
      const p = await fpgpApi.createPlan(year.id);
      toast.success('Plan created');
      navigate(`/fpgp/${p.id}/edit`);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed');
    }
  };

  if (loading) return <div className="text-sm text-ink-muted">Loading...</div>;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Faculty Performance Growth Plan"
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'FPGP' }]}
        actions={
          <select value={selectedYear} onChange={(e) => loadPlan(e.target.value)} className="border border-surface-border rounded px-3 py-2 text-sm bg-surface-base">
            {years.map((y) => <option key={y.id} value={y.label}>{y.label}</option>)}
          </select>
        }
      />

      {!plan ? (
        <Card className="text-center py-8">
          <Target className="mx-auto text-ink-subtle mb-3" size={40} />
          <p className="text-ink-muted text-sm mb-4">No FPGP plan for {selectedYear}.</p>
          <button onClick={createPlan} className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded text-sm hover:bg-primary-700">
            <Plus size={16} /> Create Plan
          </button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-ink-primary mb-1 font-serif">Plan Status</h2>
                <StatusBadge status={plan.status} size="md" />
              </div>
              <div className="flex gap-2">
                {plan.status === 'DRAFT' ? (
                  <button onClick={() => navigate(`/fpgp/${plan.id}/edit`)} className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700">
                    Fill / Edit Plan
                  </button>
                ) : (
                  <button onClick={() => navigate(`/fpgp/${plan.id}`)} className="flex items-center gap-2 text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700">
                    <FileText size={14} /> View Plan
                  </button>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-surface-border">
              <div>
                <dt className="text-xs text-ink-muted">Faculty Signed</dt>
                <dd className="font-medium text-ink-primary flex items-center gap-1">
                  {plan.facultySignedAt ? <><CheckCircle2 size={14} className="text-success-500" /> {new Date(plan.facultySignedAt).toLocaleDateString()}</> : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">HoD Signed</dt>
                <dd className="font-medium text-ink-primary flex items-center gap-1">
                  {plan.hodSignedAt ? <><CheckCircle2 size={14} className="text-success-500" /> {new Date(plan.hodSignedAt).toLocaleDateString()}</> : '—'}
                </dd>
              </div>
            </dl>
          </Card>

          {plan.reviews?.length > 0 && (
            <Card>
              <h2 className="font-semibold text-ink-primary mb-3 font-serif">HoD Feedback</h2>
              <div className="space-y-3">
                {plan.reviews.map((r: any) => (
                  <div key={r.id} className="text-sm border-l-2 border-accent-500 pl-3 py-1">
                    <p className="text-ink-primary">{r.comments}</p>
                    <p className="text-xs text-ink-muted mt-1">{r.reviewer?.name} · {new Date(r.reviewedAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
