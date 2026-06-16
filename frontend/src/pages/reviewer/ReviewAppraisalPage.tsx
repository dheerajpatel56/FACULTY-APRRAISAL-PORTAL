import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { appraisalApi } from '../../api/appraisals';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';

export default function ReviewAppraisalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      cat6Punctuality: 0, cat6Professionalism: 0, cat6Willingness: 0,
      cat6Cordiality: 0, cat6Classroom: 0,
      teachingComment: '', researchComment: '', developmentComment: '',
      governanceComment: '', supplementaryComment: '', overallComment: '',
      status: 'APPROVED',
    },
  });

  useEffect(() => {
    Promise.all([
      appraisalApi.get(id!),
      appraisalApi.getScore(id!),
    ]).then(([sub, sc]) => {
      setSubmission(sub);
      setScore(sc);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (data: any) => {
    try {
      await appraisalApi.submitReview(id!, data);
      toast.success(`Submission ${data.status.toLowerCase()}`);
      navigate('/reviews');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed');
    }
  };

  const inputCls = "w-full border border-surface-border rounded px-3 py-2 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelCls = "block text-xs font-medium text-ink-secondary mb-1";

  if (loading) return <div className="text-sm text-ink-muted">Loading...</div>;
  if (!submission) return <div className="text-sm text-danger-500">Not found</div>;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={`Review: ${submission.user?.name}`}
        subtitle={`${submission.user?.employeeCode} — Submission #${submission.submissionNumber} — ${submission.academicYear?.label}`}
        breadcrumbs={[
          { label: 'Review Queue', to: '/reviews' },
          { label: submission.user?.name },
        ]}
      />

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Submission data summary */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-3 pb-2 border-b border-accent-500/30 font-serif">Self-Appraisal Score</h2>
            {score && (
              <div className="space-y-2">
                {[
                  { label: 'Cat 1 — Teaching', val: score.cat1.total, max: 150 },
                  { label: 'Cat 2 — Research', val: score.cat2.total, max: 150 },
                  { label: 'Cat 3 — Development', val: score.cat3.total, max: 100 },
                  { label: 'Cat 4 — Governance', val: score.cat4.total, max: 50 },
                  { label: 'Cat 5 — Supplementary', val: score.cat5.total, max: 50 },
                ].map(({ label, val, max }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-ink-secondary">{label}</span>
                    <span className="text-xs font-medium text-ink-primary">{val.toFixed(1)} / {max}</span>
                  </div>
                ))}
                <div className="border-t border-surface-border pt-2 flex justify-between font-medium">
                  <span className="text-sm text-ink-secondary">Total</span>
                  <span className="text-sm text-primary-700">{score.selfTotal.toFixed(1)} / 500</span>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">Courses ({submission.cat1Courses?.length ?? 0})</h2>
            {submission.cat1Courses?.map((c: any) => (
              <div key={c.id} className="text-xs text-ink-secondary mb-1">
                {c.courseName} ({c.level}) — Pass: {c.passPercentage}% | Attend: {c.avgAttendance}%
              </div>
            ))}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">Publications</h2>
            <div className="text-xs text-ink-secondary">
              Journals: {submission.cat2Journals?.length ?? 0} | Conferences: {submission.cat2Conferences?.length ?? 0} | Patents: {submission.cat2Patents?.length ?? 0}
            </div>
          </Card>

          {(() => {
            const proofs: { label: string; url: string }[] = [];
            const add = (rows: any[], field: string, label: string) =>
              (rows ?? []).forEach((r: any, i: number) => {
                if (r[field]) proofs.push({ label: `${label} #${i + 1}`, url: r[field] });
              });
            add(submission.cat2Journals, 'proofFile', 'Journal');
            add(submission.cat2Conferences, 'proofFile', 'Conference');
            add(submission.cat2Patents, 'proofFile', 'Patent');
            add(submission.cat2Projects, 'proofFile', 'Project');
            add(submission.cat3Training, 'proofFile', 'Training');
            add(submission.cat5Awards, 'proofFile', 'Award');
            add(submission.cat1EContent, 'evidenceFile', 'e-Content');
            add(submission.cat1ICT, 'evidenceFile', 'ICT');
            return (
              <Card>
                <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">
                  Proof Documents ({proofs.length})
                </h2>
                {proofs.length === 0 ? (
                  <div className="text-xs text-ink-muted">No proof files attached.</div>
                ) : (
                  <ul className="space-y-1">
                    {proofs.map((p, i) => (
                      <li key={i} className="text-xs">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          📎 {p.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })()}
        </div>

        {/* Right: Review form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-3 pb-2 border-b border-accent-500/30 font-serif">Category 6 — Core Values (0-10 each)</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['cat6Punctuality', 'Punctuality'],
                ['cat6Professionalism', 'Professionalism'],
                ['cat6Willingness', 'Willingness'],
                ['cat6Cordiality', 'Cordiality'],
                ['cat6Classroom', 'Classroom Conduct'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className={labelCls}>{label}</label>
                  <input type="number" min="0" max="10" step="0.5"
                    {...register(field as any, { valueAsNumber: true })}
                    className={inputCls} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-3 pb-2 border-b border-accent-500/30 font-serif">Comments</h2>
            <p className="text-[10px] text-ink-muted mb-3">Released to faculty on approval/rejection</p>
            <div className="space-y-3">
              {[
                ['teachingComment', 'Teaching'],
                ['researchComment', 'Research'],
                ['developmentComment', 'Development'],
                ['governanceComment', 'Governance'],
                ['supplementaryComment', 'Supplementary'],
                ['overallComment', 'Overall'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label className={labelCls}>{label} Comment</label>
                  <textarea rows={2} {...register(field as any)} className={inputCls} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-3 pb-2 border-b border-accent-500/30 font-serif">Decision</h2>
            <div className="flex gap-3">
              <label className="flex-1 border-2 border-emerald-200 rounded p-3 cursor-pointer has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
                <input type="radio" {...register('status')} value="APPROVED" className="sr-only" />
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle size={16} /> Approve
                </div>
              </label>
              <label className="flex-1 border-2 border-red-200 rounded p-3 cursor-pointer has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                <input type="radio" {...register('status')} value="REJECTED" className="sr-only" />
                <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                  <XCircle size={16} /> Reject
                </div>
              </label>
            </div>
          </Card>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-600 text-white py-2.5 rounded font-medium text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
