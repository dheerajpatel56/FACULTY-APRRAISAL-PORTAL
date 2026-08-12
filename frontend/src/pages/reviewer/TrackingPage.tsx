import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, CalendarClock, Download } from 'lucide-react';
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

  // Admin/dean assigns a faculty's tier by hand. Re-fetch so the segregation
  // matrix + filters stay in sync.
  const setTier = async (userId: string, tier: 'T1' | 'T2' | 'T3' | null) => {
    try {
      await trackingApi.setTier(userId, yearId, tier);
      const fresh = await trackingApi.get(yearId);
      setData(fresh);
    } catch {
      toast.error('Failed to set tier');
    }
  };

  const [fCadre, setFCadre] = useState('');
  const [fTier, setFTier] = useState('');
  const [fElig, setFElig] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportXlsx = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await trackingApi.exportExcel(yearId, data.year.label);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
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

  const cadreOptions = data ? Object.keys(data.aggregates.byCadre) : [];
  const filtered = (data?.rows ?? []).filter((r) => {
    if (fCadre && (r.cadreLabel ?? 'Unassigned') !== fCadre) return false;
    if (fTier && (r.tier ?? 'none') !== fTier) return false;
    if (fElig) {
      const scored = r.eligibility.requirements.length > 0;
      if (fElig === 'eligible' && !(scored && r.eligibility.eligible)) return false;
      if (fElig === 'not' && !(scored && !r.eligibility.eligible)) return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Criteria Tracking"
        subtitle="Actuals vs cadre targets, eligibility and tier per faculty."
        breadcrumbs={[{ label: 'Criteria Tracking' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportXlsx}
              disabled={exporting || !data || data.rows.length === 0}
              className="flex items-center gap-2 border border-surface-border text-ink-secondary px-3 py-2 rounded text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
              title="Download the cadre + tier report as Excel"
            >
              <Download size={16} /> {exporting ? 'Exporting…' : 'Export'}
            </button>
            {isAdmin() && (
              <button
                onClick={runSnapshot}
                disabled={snapshotting || !yearId}
                className="flex items-center gap-2 border border-surface-border text-ink-secondary px-3 py-2 rounded text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
                title="Snapshot this quarter's standing and email each faculty their feedback"
              >
                <CalendarClock size={16} /> {snapshotting ? 'Running…' : 'Run quarterly snapshot'}
              </button>
            )}
          </div>
        }
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
      {data && isAdmin() && data.rows.length > 0 && (
        <div className="mb-3 text-xs text-ink-muted bg-surface-muted/40 border border-surface-border rounded px-3 py-2">
          Review each faculty's actuals against their cadre targets (expand a row), then set their tier (T1/T2/T3) in the Tier column.
        </div>
      )}

      {data && data.rows.length > 0 && (
        <>
          <Card className="mb-4 overflow-x-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Segregation by cadre &amp; tier</div>
            <table className="text-sm min-w-[36rem]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-ink-muted border-b border-surface-border">
                  <th className={th}>Cadre</th>
                  <th className={th}>T1</th>
                  <th className={th}>T2</th>
                  <th className={th}>T3</th>
                  <th className={th}>No tier</th>
                  <th className={th}>Eligible</th>
                  <th className={th}>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.aggregates.byCadre).map(([cadre, a]) => (
                  <tr key={cadre} className="border-b border-surface-border/50">
                    <td className="py-1.5 px-2 font-medium text-ink-primary">{cadre}</td>
                    <td className="py-1.5 px-2 text-ink-secondary">{a.tiers.T1}</td>
                    <td className="py-1.5 px-2 text-ink-secondary">{a.tiers.T2}</td>
                    <td className="py-1.5 px-2 text-ink-secondary">{a.tiers.T3}</td>
                    <td className="py-1.5 px-2 text-ink-muted">{a.tiers.none}</td>
                    <td className="py-1.5 px-2 text-emerald-700">{a.eligible}</td>
                    <td className="py-1.5 px-2 font-medium">{a.total}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5 px-2">All</td>
                  <td className="py-1.5 px-2">{data.aggregates.byTier.T1}</td>
                  <td className="py-1.5 px-2">{data.aggregates.byTier.T2}</td>
                  <td className="py-1.5 px-2">{data.aggregates.byTier.T3}</td>
                  <td className="py-1.5 px-2 text-ink-muted">{data.aggregates.byTier.none}</td>
                  <td className="py-1.5 px-2 text-emerald-700">{data.aggregates.eligible}</td>
                  <td className="py-1.5 px-2">{data.aggregates.total}</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <div className="flex flex-wrap gap-2 mb-3">
            <select value={fCadre} onChange={(e) => setFCadre(e.target.value)} className={inputCls}>
              <option value="">All cadres</option>
              {cadreOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={fTier} onChange={(e) => setFTier(e.target.value)} className={inputCls}>
              <option value="">All tiers</option>
              <option value="T1">T1</option>
              <option value="T2">T2</option>
              <option value="T3">T3</option>
              <option value="none">No tier</option>
            </select>
            <select value={fElig} onChange={(e) => setFElig(e.target.value)} className={inputCls}>
              <option value="">All eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="not">Not eligible</option>
            </select>
            <span className="text-xs text-ink-muted self-center">{filtered.length} of {data.rows.length}</span>
          </div>
        </>
      )}

      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : !data || filtered.length === 0 ? (
        <Card><div className="text-sm text-ink-muted py-4 text-center">No matching faculty.</div></Card>
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
              {filtered.map((r) => {
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
                      <td className="py-2 px-2" onClick={(e) => e.stopPropagation()}>
                        {isAdmin() ? (
                          <select
                            value={r.tier ?? ''}
                            onChange={(e) => setTier(r.faculty.id, (e.target.value || null) as 'T1' | 'T2' | 'T3' | null)}
                            className="text-xs border border-surface-border rounded px-1.5 py-1 bg-surface-base focus:outline-none focus:ring-1 focus:ring-primary-500"
                            title="Assign tier"
                          >
                            <option value="">—</option>
                            <option value="T1">T1</option>
                            <option value="T2">T2</option>
                            <option value="T3">T3</option>
                          </select>
                        ) : <TierBadge tier={r.tier} />}
                      </td>
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
