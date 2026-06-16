import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fpgpApi } from '../../api/fpgp';
import toast from 'react-hot-toast';
import { Save, Lock, CheckCircle2, Info } from 'lucide-react';
import { RenderSubsection } from './components/SubsectionRenderers';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';

const CATEGORIES = [
  { id: '1', title: 'Category 1 — Teaching & Learning' },
  { id: '2', title: 'Category 2 — Research & Consultancy' },
  { id: '3', title: 'Category 3 — Departmental / Institutional Development' },
  { id: '4', title: 'Category 4 — Others' },
];

export default function FPGPFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [template, setTemplate] = useState<any[]>([]);
  const [state, setState] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [annexureOpen, setAnnexureOpen] = useState<null | 'I' | 'II'>(null);

  useEffect(() => {
    Promise.all([fpgpApi.getTemplate(), fpgpApi.getPlanDetail(id!)])
      .then(([tpl, p]) => {
        setTemplate(tpl);
        setPlan(p);
        const init: Record<string, any> = {};
        for (const s of p.subsections) {
          init[s.subsection] = {
            sem1Text: s.sem1Text, sem2Text: s.sem2Text,
            extraText1: s.extraText1, extraText2: s.extraText2, extraText3: s.extraText3,
            rows: s.rows ?? [],
          };
        }
        setState(init);
      })
      .catch(() => toast.error('Failed to load plan'));
  }, [id]);

  const readOnly = !!plan && plan.status !== 'DRAFT';

  const saveLock = useRef<Promise<void>>(Promise.resolve());
  const save = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const prev = saveLock.current;
    let release: () => void = () => {};
    saveLock.current = new Promise<void>((res) => { release = res; });
    try {
      await prev;
      if (!silent) setSaving(true);
      const updates = Object.entries(state).map(([subsection, v]) => ({ subsection, ...v }));
      await fpgpApi.updateSubsections(id!, updates);
      if (!silent) toast.success('Saved');
    } catch (e: any) {
      if (!silent) toast.error(e?.response?.data?.error ?? 'Save failed');
      else console.warn('Autosave failed', e);
      throw e;
    } finally {
      if (!silent) setSaving(false);
      release();
    }
  };

  const facultySign = async () => {
    if (!confirm('Sign and activate plan? Targets will be locked permanently.')) return;
    try {
      await save({ silent: true });
      await fpgpApi.facultySign(id!);
      toast.success('Plan signed and activated');
      navigate('/fpgp');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Sign failed');
    }
  };

  const updateSub = (sub: string, next: any) => {
    setState((s) => ({ ...s, [sub]: next }));
  };

  if (!plan || template.length === 0) return <div className="text-sm text-ink-muted">Loading...</div>;

  return (
    <div className="max-w-5xl pb-12">
      <PageHeader
        title="Faculty Professional Growth Plan"
        breadcrumbs={[{ label: 'FPGP', to: '/fpgp' }, { label: 'Edit Plan' }]}
        actions={<StatusBadge status={plan.status} size="md" />}
      />

      {/* Institute banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-md p-4 mb-4 text-center">
        <div className="font-bold text-base">VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI</div>
        <div className="text-sm">INSTITUTE OF ENGINEERING AND TECHNOLOGY</div>
        <div className="text-xs mt-1 opacity-90">An Autonomous, NAAC A++, NBA Accredited Institute</div>
      </div>

      {/* Annexure prompt */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-xs text-amber-900 flex items-start gap-2">
        <Info size={14} className="mt-0.5 flex-shrink-0" />
        <div>
          All faculty must follow requirements / guidelines in
          <button onClick={() => setAnnexureOpen('I')} className="underline ml-1 font-semibold">ANNEXURE I</button>
          {' '}and{' '}
          <button onClick={() => setAnnexureOpen('II')} className="underline font-semibold">ANNEXURE II</button>
          {' '}before filling FPGP.
        </div>
      </div>

      {readOnly && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 mb-4 text-sm text-emerald-900">
          Plan is <strong>{plan.status}</strong> and read-only.
          {plan.facultySignedAt && <span> Faculty signed {new Date(plan.facultySignedAt).toLocaleDateString()}.</span>}
          {plan.hodSignedAt && <span> HoD signed {new Date(plan.hodSignedAt).toLocaleDateString()}.</span>}
        </div>
      )}

      {/* Faculty profile */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink-primary mb-3 font-serif">Faculty Profile</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-ink-muted">Name & Employee Code</dt><dd className="text-ink-primary">{plan.user?.name} ({plan.user?.employeeCode})</dd></div>
          <div><dt className="text-xs text-ink-muted">Designation</dt><dd className="text-ink-primary">{plan.designationSnap ?? plan.user?.designation ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Department</dt><dd className="text-ink-primary">{plan.departmentSnap ?? plan.user?.department?.name ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Date of Joining</dt><dd className="text-ink-primary">{plan.dateOfJoiningSnap ? new Date(plan.dateOfJoiningSnap).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Total Experience</dt><dd className="text-ink-primary">{plan.totalExperienceSnap != null ? `${plan.totalExperienceSnap} years` : '—'}</dd></div>
        </dl>
      </Card>

      {/* Category blocks */}
      {CATEGORIES.map((cat) => {
        const subs = template.filter((t) => t.sub.startsWith(`${cat.id}.`));
        return (
          <Card key={cat.id} className="mb-4">
            <h2 className="font-bold text-ink-primary text-base mb-4 pb-2 border-b-2 border-accent-500/30 font-serif">
              {cat.title}
            </h2>
            <div className="space-y-6">
              {subs.map((def: any) => (
                <div key={def.sub}>
                  <h3 className="font-semibold text-sm text-ink-primary mb-1">{def.sub} — {def.label.split('—')[0].trim()}</h3>
                  {def.label.includes('—') && <p className="text-xs text-ink-muted mb-2">{def.label.split('—').slice(1).join('—').trim()}</p>}
                  <RenderSubsection
                    def={def}
                    value={state[def.sub] ?? {}}
                    onChange={(v) => updateSub(def.sub, v)}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {/* Signature footer */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink-primary mb-3 font-serif">Signatures</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="border border-surface-border rounded p-3">
            <div className="text-xs text-ink-muted mb-1">Signature of the Faculty</div>
            {plan.facultySignedAt ? (
              <div className="flex items-center gap-2 text-success-500">
                <CheckCircle2 size={16} /> Signed on {new Date(plan.facultySignedAt).toLocaleString()}
              </div>
            ) : (
              <div className="text-ink-subtle italic">Not signed</div>
            )}
          </div>
          <div className="border border-surface-border rounded p-3">
            <div className="text-xs text-ink-muted mb-1">Signature of the HOD</div>
            {plan.hodSignedAt ? (
              <div className="flex items-center gap-2 text-success-500">
                <CheckCircle2 size={16} /> Signed by {plan.hodSigner?.name ?? ''} on {new Date(plan.hodSignedAt).toLocaleString()}
              </div>
            ) : (
              <div className="text-ink-subtle italic">Pending HoD sign</div>
            )}
          </div>
        </div>
      </Card>

      {/* Action bar */}
      {!readOnly && (
        <div className="sticky bottom-4 bg-surface-card border border-surface-border rounded-md p-3 flex justify-end gap-2 shadow-lg">
          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="flex items-center gap-2 text-sm border border-surface-border px-4 py-2 rounded hover:bg-surface-muted disabled:opacity-50"
          >
            <Save size={14} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={facultySign}
            className="flex items-center gap-2 text-sm bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            <Lock size={14} /> Sign & Activate
          </button>
        </div>
      )}

      {/* Annexure modal */}
      {annexureOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAnnexureOpen(null)}>
          <div className="bg-surface-card rounded-md max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-ink-primary font-serif">Annexure {annexureOpen}</h3>
              <button onClick={() => setAnnexureOpen(null)} className="text-ink-subtle hover:text-ink-primary">✕</button>
            </div>
            <AnnexureContent which={annexureOpen} />
          </div>
        </div>
      )}
    </div>
  );
}

function AnnexureContent({ which }: { which: 'I' | 'II' }) {
  const [text, setText] = useState('Loading...');
  useEffect(() => {
    fetch(`/annexures/annexure-${which}.md`)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText('Annexure content not available.'));
  }, [which]);
  return <pre className="text-xs text-ink-secondary whitespace-pre-wrap font-sans">{text}</pre>;
}
