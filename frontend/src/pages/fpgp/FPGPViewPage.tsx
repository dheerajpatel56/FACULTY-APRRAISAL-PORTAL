import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fpgpApi } from '../../api/fpgp';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { CheckCircle2, Stamp, MessageSquarePlus, Download } from 'lucide-react';
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

export default function FPGPViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<any>(null);
  const [template, setTemplate] = useState<any[]>([]);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => { reload(); }, [id]);

  const reload = () => {
    Promise.all([fpgpApi.getTemplate(), fpgpApi.getPlanDetail(id!)])
      .then(([tpl, p]) => { setTemplate(tpl); setPlan(p); })
      .catch(() => toast.error('Failed to load plan'));
  };

  const downloadPdf = async () => {
    try {
      const blob = await fpgpApi.downloadPdf(id!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fpgp-${plan?.user?.employeeCode ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF download failed');
    }
  };

  const evaluate = async () => {
    if (!confirm('Run target evaluation now for this academic year? ACTIVE plans will be auto-accepted or flagged for review.')) return;
    try {
      const r = await fpgpApi.evaluate(plan.academicYearId);
      toast.success(`Evaluated ${r.evaluated} of ${r.total} plan(s)`);
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Evaluation failed');
    }
  };

  const hodSign = async () => {
    if (!confirm('Sign this plan as HoD? Status becomes REVIEWED.')) return;
    try {
      await fpgpApi.hodSign(id!);
      toast.success('Signed');
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Sign failed');
    }
  };

  const submitReview = async () => {
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      await fpgpApi.addReview(id!, reviewText);
      toast.success('Feedback added');
      setReviewText('');
      reload();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!plan || template.length === 0) return <div className="text-sm text-ink-muted">Loading...</div>;

  const isOwnPlan = user?.id === plan.userId;
  const isHodForDept = user?.roles?.some((r: any) => r.role === 'HOD' && r.departmentId && r.departmentId === plan.user?.departmentId);
  const isAdmin = user?.roles?.some((r: any) => r.role === 'ADMIN');
  const canHodSign = !isOwnPlan && (isHodForDept || isAdmin) && plan.status === 'ACTIVE';
  const canAddReview = !isOwnPlan && (isHodForDept || isAdmin || user?.roles?.some((r: any) => r.role === 'REVIEWER'));

  const stateBySub: Record<string, any> = {};
  for (const s of plan.subsections) {
    stateBySub[s.subsection] = {
      sem1Text: s.sem1Text, sem2Text: s.sem2Text,
      extraText1: s.extraText1, extraText2: s.extraText2, extraText3: s.extraText3,
      rows: s.rows ?? [],
    };
  }

  return (
    <div className="max-w-5xl pb-12">
      {/* Print-only institute header */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '12pt', borderBottom: '2pt solid #000', paddingBottom: '8pt' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI</div>
        <div style={{ fontSize: '11pt' }}>INSTITUTE OF ENGINEERING &amp; TECHNOLOGY</div>
        <div style={{ fontSize: '9pt', marginTop: '2pt' }}>NAAC A++ · NBA Accredited · Autonomous Institution</div>
        <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '8pt' }}>
          Faculty Performance Growth Plan — {plan.user?.name} · {plan.academicYear?.label ?? ''}
        </div>
      </div>

      <PageHeader
        title="FPGP — View"
        breadcrumbs={[{ label: 'FPGP', to: '/fpgp' }, { label: `Plan #${id?.slice(0, 8)}` }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={plan.status} size="md" />
            {isAdmin && (
              <button onClick={evaluate} className="flex items-center gap-1 text-sm border border-surface-border px-3 py-1.5 rounded hover:bg-surface-muted">
                <Stamp size={14} /> Evaluate
              </button>
            )}
            <button onClick={downloadPdf} className="flex items-center gap-1 text-sm border border-surface-border px-3 py-1.5 rounded hover:bg-surface-muted">
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      {/* Institute banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-md p-4 mb-4 text-center">
        <div className="font-bold text-base">VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI</div>
        <div className="text-sm">INSTITUTE OF ENGINEERING AND TECHNOLOGY</div>
      </div>

      {/* Profile */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink-primary mb-3 font-serif">Faculty Profile</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-ink-muted">Name & Code</dt><dd className="text-ink-primary">{plan.user?.name} ({plan.user?.employeeCode})</dd></div>
          <div><dt className="text-xs text-ink-muted">Designation</dt><dd className="text-ink-primary">{plan.designationSnap ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Department</dt><dd className="text-ink-primary">{plan.departmentSnap ?? plan.user?.department?.name ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Date of Joining</dt><dd className="text-ink-primary">{plan.dateOfJoiningSnap ? new Date(plan.dateOfJoiningSnap).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="text-xs text-ink-muted">Total Experience</dt><dd className="text-ink-primary">{plan.totalExperienceSnap != null ? `${plan.totalExperienceSnap} years` : '—'}</dd></div>
        </dl>
      </Card>

      {/* Target reconciliation report */}
      {Array.isArray(plan.achievement) && plan.achievement.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink-primary font-serif">Target Achievement (vs Appraisal)</h2>
            <span className={`text-xs px-2 py-1 rounded font-semibold ${plan.autoAccepted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {plan.autoAccepted ? 'ALL TARGETS MET — ACCEPTED' : 'TARGETS NOT FULLY MET — NEEDS REVIEW'}
            </span>
          </div>
          {plan.evaluatedAt && <p className="text-xs text-ink-muted mb-3">Evaluated {new Date(plan.evaluatedAt).toLocaleString()}</p>}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-secondary">
                <th className="border border-surface-border bg-surface-muted px-2 py-1.5">Target</th>
                <th className="border border-surface-border bg-surface-muted px-2 py-1.5 w-24">Planned</th>
                <th className="border border-surface-border bg-surface-muted px-2 py-1.5 w-24">Achieved</th>
                <th className="border border-surface-border bg-surface-muted px-2 py-1.5 w-20">Met</th>
              </tr>
            </thead>
            <tbody>
              {plan.achievement.map((it: any) => (
                <tr key={it.subsection}>
                  <td className="border border-surface-border px-2 py-1">{it.subsection} — {it.label}</td>
                  <td className="border border-surface-border px-2 py-1">{it.target}</td>
                  <td className="border border-surface-border px-2 py-1">{it.achieved}</td>
                  <td className={`border border-surface-border px-2 py-1 font-semibold ${it.met ? 'text-emerald-600' : 'text-red-500'}`}>{it.met ? '✔' : '✘'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {CATEGORIES.map((cat) => {
        const subs = template.filter((t) => t.sub.startsWith(`${cat.id}.`));
        return (
          <Card key={cat.id} className="mb-4">
            <h2 className="font-bold text-ink-primary text-base mb-4 pb-2 border-b-2 border-accent-500/30 font-serif">{cat.title}</h2>
            <div className="space-y-6">
              {subs.map((def: any) => (
                <div key={def.sub}>
                  <h3 className="font-semibold text-sm text-ink-primary mb-1">{def.sub} — {def.label.split('—')[0].trim()}</h3>
                  <RenderSubsection def={def} value={stateBySub[def.sub] ?? {}} onChange={() => {}} readOnly={true} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {/* Signatures */}
      <Card className="mb-4">
        <h2 className="font-semibold text-ink-primary mb-3 font-serif">Signatures</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="border border-surface-border rounded p-3">
            <div className="text-xs text-ink-muted mb-1">Faculty</div>
            {plan.facultySignedAt ? (
              <div className="flex items-center gap-2 text-success-500">
                <CheckCircle2 size={16} /> {new Date(plan.facultySignedAt).toLocaleString()}
              </div>
            ) : <div className="text-ink-subtle italic">Not signed</div>}
          </div>
          <div className="border border-surface-border rounded p-3">
            <div className="text-xs text-ink-muted mb-1">HoD</div>
            {plan.hodSignedAt ? (
              <div className="flex items-center gap-2 text-success-500">
                <CheckCircle2 size={16} /> {plan.hodSigner?.name} · {new Date(plan.hodSignedAt).toLocaleString()}
              </div>
            ) : <div className="text-ink-subtle italic">Pending HoD sign</div>}
          </div>
        </div>
        {canHodSign && (
          <button onClick={hodSign} className="mt-4 flex items-center gap-2 text-sm bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700">
            <Stamp size={14} /> HoD Sign Plan
          </button>
        )}
      </Card>

      {/* HoD feedback */}
      <Card>
        <h2 className="font-semibold text-ink-primary mb-3 font-serif">HoD Feedback</h2>
        {plan.reviews?.length > 0 ? (
          <div className="space-y-3 mb-4">
            {plan.reviews.map((r: any) => (
              <div key={r.id} className="text-sm border-l-2 border-accent-500 pl-3 py-1">
                <p className="text-ink-primary">{r.comments}</p>
                <p className="text-xs text-ink-muted mt-1">{r.reviewer?.name} · {new Date(r.reviewedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-ink-muted mb-4">No feedback yet.</p>}

        {canAddReview && (
          <div className="space-y-2">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Add feedback..."
              className="w-full border border-surface-border rounded px-3 py-2 text-sm min-h-[80px] bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={submitReview} disabled={submittingReview || !reviewText.trim()} className="flex items-center gap-2 text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700 disabled:opacity-50">
              <MessageSquarePlus size={14} /> {submittingReview ? 'Posting...' : 'Post Feedback'}
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
