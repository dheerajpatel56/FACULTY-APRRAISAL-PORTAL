import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, CalendarClock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../api/users';
import { trackingApi, type TrackingResponse, type TrackingRow } from '../../api/tracking';

const TIER_STYLE: Record<string, string> = {
  T1: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  T2: 'bg-blue-50 text-blue-700 border-blue-200',
  T3: 'bg-amber-50 text-amber-700 border-amber-200',
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-ink-muted">—</span>;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${TIER_STYLE[tier]}`}>{tier}</span>;
}

function RequirementRows({ row }: { row: TrackingRow }) {
  if (!row.eligibility.requirements.length) {
    return <div className="text-xs text-ink-muted px-3 py-2">No cadre target configured for this faculty ({row.cadreLabel ?? 'unknown cadre'}).</div>;
  }
  return (
    <div className="px-3 py-2 bg-surface-muted/40">
      <table className="text-xs w-full max-w-lg">
        <tbody>
          {row.eligibility.requirements.map((req) => (
            <tr key={req.key}>
              <td className="py-1 pr-3 text-ink-secondary">
                {req.label}
                {!req.gating && <span className="ml-1 text-ink-subtle">(info)</span>}
              </td>
              <td className="py-1 pr-3 text-ink-muted">target {req.target}</td>
              <td className="py-1 pr-3 text-ink-primary">actual {req.actual}</td>
              <td className="py-1">
                {req.met ? <CheckCircle2 size={13} className="text-emerald-600" /> : <XCircle size={13} className="text-red-500" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TrackingPage() {
  const [years, setYears] = useState<any[]>([]);
  const [yearId, setYearId] = useState('');
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);
  const { isAdmin } = useAuthStore();

  const runSnapshot = async () => {
    setSnapshotting(true);
    try {
      const res = await trackingApi.runSnapshot(yearId || undefined);
      toast.success(res.message);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Snapshot failed');
    } finally {
      setSnapshotting(false);
    }
  };

  useEffect(() => {
    userApi.listAcademicYears().then((ys: any[]) => {
      setYears(ys);
      const open = ys.find((y) => y.submissionOpen) ?? ys[0];
      if (open) setYearId(open.id);
    }).catch(() => toast.error('Failed to load academic years'));
  }, []);

  useEffect(() => {
    if (!yearId) return;
    setLoading(true);
    trackingApi.get(yearId).then(setData).catch(() => toast.error('Failed to load tracking')).finally(() => setLoading(false));
  }, [yearId]);

  const inputCls = 'border border-surface-border rounded px-3 py-2 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500';
  const th = 'py-2 px-2 font-semibold text-left';
  const cell = (met: boolean) => `py-2 px-2 ${met ? 'text-ink-primary' : 'text-red-600'}`;

  return (
    <div>
      <PageHeader
        title="Criteria Tracking"
        subtitle="Actuals vs cadre targets, eligibility and tier per faculty."
        breadcrumbs={[{ label: 'Criteria Tracking' }]}
        actions={isAdmin() ? (
          <button
            onClick={runSnapshot}
            disabled={snapshotting || !yearId}
            className="flex items-center gap-2 border border-surface-border text-ink-secondary px-3 py-2 rounded text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
            title="Snapshot this quarter's standing and email each faculty their feedback"
          >
            <CalendarClock size={16} /> {snapshotting ? 'Running…' : 'Run quarterly snapshot'}
          </button>
        ) : undefined}
      />

      <div className="mb-4 max-w-xs">
        <label className="block text-xs font-medium text-ink-secondary mb-1">Academic Year</label>
        <select value={yearId} onChange={(e) => setYearId(e.target.value)} className={`${inputCls} w-full`}>
          {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
        </select>
      </div>

      {data && !data.hasTargets && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          No cadre targets set for this year — eligibility can't be computed. Set them in Admin → Cadre Targets.
        </div>
      )}
      {data && !data.hasTierRules && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          No tier rules set for this year — tiers won't be assigned. Set them in Admin → Tier Rules.
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : !data || data.rows.length === 0 ? (
        <Card><div className="text-sm text-ink-muted py-4 text-center">No submissions for this year.</div></Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink-muted border-b border-surface-border">
                <th className={th}></th>
                <th className={th}>Faculty</th>
                <th className={th}>Cadre</th>
                <th className={th}>Exp</th>
                <th className={th}>Tier</th>
                <th className={th}>Eligible</th>
                <th className={th}>Total</th>
                <th className={th}>Feedback</th>
                <th className={th}>Indexed</th>
                <th className={th}>Journal</th>
                <th className={th}>Pat</th>
                <th className={th}>Proj</th>
                <th className={th}>Cons</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const req = (k: string) => r.eligibility.requirements.find((x) => x.key === k);
                const isOpen = expanded === r.submissionId;
                return (
                  <Fragment key={r.submissionId}>
                    <tr
                      className="border-b border-surface-border/60 hover:bg-surface-muted/40 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : r.submissionId)}
                    >
                      <td className="py-2 px-2 text-ink-muted">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                      <td className="py-2 px-2">
                        <div className="font-medium text-ink-primary">{r.faculty.name}</div>
                        <div className="text-xs text-ink-muted">{r.faculty.employeeCode}</div>
                      </td>
                      <td className="py-2 px-2 text-ink-secondary">{r.cadreLabel ?? '—'}</td>
                      <td className="py-2 px-2 text-ink-secondary">{r.expYears}y</td>
                      <td className="py-2 px-2"><TierBadge tier={r.tier} /></td>
                      <td className="py-2 px-2">
                        {r.eligibility.requirements.length === 0
                          ? <span className="text-xs text-ink-muted">—</span>
                          : r.eligibility.eligible
                            ? <CheckCircle2 size={16} className="text-emerald-600" />
                            : <XCircle size={16} className="text-red-500" />}
                      </td>
                      <td className={cell(req('totalScore')?.met ?? true)}>
                        {r.actuals.totalScore}
                        <span className="text-ink-subtle text-[10px] ml-0.5">{r.actuals.totalScoreSource === 'SELF' ? '(self)' : ''}</span>
                      </td>
                      <td className={cell(req('feedback')?.met ?? true)}>{r.actuals.feedback}</td>
                      <td className={cell(req('indexed')?.met ?? true)}>{r.actuals.indexedCount}</td>
                      <td className={cell(req('journal')?.met ?? true)}>{r.actuals.journalCount}</td>
                      <td className="py-2 px-2 text-ink-secondary">{r.actuals.patentCount}</td>
                      <td className="py-2 px-2 text-ink-secondary">{r.actuals.projectCount}</td>
                      <td className="py-2 px-2 text-ink-secondary">{r.actuals.consultancyCount}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={13}><RequirementRows row={r} /></td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
