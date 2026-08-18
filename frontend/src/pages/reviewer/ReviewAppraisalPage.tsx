import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { appraisalApi } from '../../api/appraisals';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import ProofVerificationPanel from '../../components/ProofVerificationPanel';
import FeedbackSection from '../../components/FeedbackSection';
import { courseResultScore } from '../../utils/scoring';

export default function ReviewAppraisalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      cat1Score: undefined as number | undefined,
      cat2Score: undefined as number | undefined,
      cat3Score: undefined as number | undefined,
      cat4Score: undefined as number | undefined,
      cat5Score: undefined as number | undefined,
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
      // Seed the reviewer's marks with what the engine computed, so the form
      // starts from the evidence and the reviewer only edits what they disagree with.
      reset((prev: any) => ({
        ...prev,
        cat1Score: sc.cat1.total, cat2Score: sc.cat2.total, cat3Score: sc.cat3.total,
        cat4Score: sc.cat4.total, cat5Score: sc.cat5.total,
      }));
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  // Live Cat 6 running total for the score card — the only part of the review
  // score the reviewer actually awards (1-5 are recomputed server-side).
  const cat6Fields = watch(['cat6Punctuality', 'cat6Professionalism', 'cat6Willingness', 'cat6Cordiality', 'cat6Classroom']);
  const cat6Total = Math.min(cat6Fields.reduce((sum: number, v: any) => sum + (Number(v) || 0), 0), 50);

  // Reviewer's own marks for 1-5 (seeded from the computed score, editable).
  const awarded = watch(['cat1Score', 'cat2Score', 'cat3Score', 'cat4Score', 'cat5Score']);
  const awardedTotal = awarded.reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);

  const onSubmit = async (data: any) => {
    // Approval cannot be revisited (the API returns "Already approved"), so make
    // the reviewer confirm the marks they are locking in.
    if (data.status === 'APPROVED') {
      const total = (awardedTotal + cat6Total).toFixed(1);
      const ok = window.confirm(
        `Approve this appraisal with a reviewed total of ${total} / 550?

` +
        'A submission can only be approved once — the marks cannot be changed afterwards.'
      );
      if (!ok) return;
    }
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
        actions={
          <button
            onClick={() => navigate(`/appraisal/${id}/edit`)}
            className="flex items-center gap-1 text-sm border border-surface-border px-3 py-1.5 rounded hover:bg-surface-muted"
          >
            <Eye size={14} /> View Full Form
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Submission data summary */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-3 pb-2 border-b border-accent-500/30 font-serif">Score</h2>
            {score && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-muted">
                  <span>Category</span>
                  <span className="flex gap-4">
                    <span className="w-20 text-right">Self</span>
                    <span className="w-20 text-right">HoD Review</span>
                  </span>
                </div>
                {[
                  { label: 'Cat 1 — Teaching', val: score.cat1.total, max: 150, field: 'cat1Score' },
                  { label: 'Cat 2 — Research', val: score.cat2.total, max: 150, field: 'cat2Score' },
                  { label: 'Cat 3 — Development', val: score.cat3.total, max: 100, field: 'cat3Score' },
                  { label: 'Cat 4 — Governance', val: score.cat4.total, max: 50, field: 'cat4Score' },
                  { label: 'Cat 5 — Supplementary', val: score.cat5.total, max: 50, field: 'cat5Score' },
                ].map(({ label, val, max, field }, idx) => {
                  const mark = Number(awarded[idx] ?? val) || 0;
                  const changed = Math.abs(mark - val) > 0.001;
                  return (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-ink-secondary">
                        {label}
                        {changed && (
                          <span className="ml-1 text-[10px] text-accent-600">
                            ({mark > val ? '+' : ''}{(mark - val).toFixed(1)})
                          </span>
                        )}
                      </span>
                      <span className="flex gap-4 items-center text-xs">
                        <span className="w-20 text-right font-medium text-ink-primary">{val.toFixed(1)} / {max}</span>
                        <span className="w-20 flex items-center justify-end gap-1">
                          <input
                            type="number" min="0" max={max} step="0.5"
                            {...register(field as any, { valueAsNumber: true })}
                            className={`w-14 text-right border rounded px-1 py-0.5 text-xs bg-surface-card text-ink-primary ${changed ? 'border-accent-500' : 'border-surface-border'}`}
                          />
                          <span className="text-ink-subtle">/{max}</span>
                        </span>
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-secondary">Cat 6 — Core Values</span>
                  <span className="flex gap-4 text-xs">
                    <span className="w-20 text-right text-ink-subtle">—</span>
                    <span className="w-20 text-right font-medium text-ink-primary pr-6">{cat6Total.toFixed(1)} / 50</span>
                  </span>
                </div>
                <div className="border-t border-surface-border pt-2 flex items-center justify-between font-medium">
                  <span className="text-sm text-ink-secondary">Total</span>
                  <span className="flex gap-4 text-sm">
                    <span className="w-20 text-right text-primary-700">{score.selfTotal.toFixed(1)} / 500</span>
                    <span className="w-20 text-right text-primary-700 pr-6">{(awardedTotal + cat6Total).toFixed(1)} / 550</span>
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted pt-1">
                  The review column starts from what the engine computed off the submitted evidence. Edit any
                  category you disagree with — a changed mark is highlighted with the difference. Cat 6 is scored
                  in the Core Values card below. Both totals are recorded.
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">1.1 Courses — Lectures ({submission.cat1Courses?.length ?? 0})</h2>
            {submission.cat1Courses?.map((c: any) => (
              <div key={c.id} className="text-xs text-ink-secondary mb-1">
                {c.courseName} ({c.level}) — Periods: {c.periodsConducted}/{c.periodPlanned}{c.novelPedagogyUsed ? ' | Novel pedagogy' : ''}
              </div>
            ))}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">1.2 Attendance, Feedback &amp; Results ({submission.cat1CourseResults?.length ?? 0})</h2>
            {submission.cat1CourseResults?.map((c: any) => {
              const Y = c.classSize || 0;
              // Same helper the scoring engines use — never re-derive 1.2 here.
              const { A, B, C, total } = courseResultScore(c);
              return (
                <div key={c.id} className="text-xs text-ink-secondary mb-1">
                  {c.courseName} (Y={Y}) — A: {A.toFixed(2)} | B: {B.toFixed(2)} | C: {C.toFixed(2)} | Total: {total.toFixed(2)}
                </div>
              );
            })}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-ink-primary mb-2 pb-2 border-b border-accent-500/30 font-serif">Publications</h2>
            <div className="text-xs text-ink-secondary">
              Journals: {submission.cat2Journals?.length ?? 0} | Conferences: {submission.cat2Conferences?.length ?? 0} | Patents: {submission.cat2Patents?.length ?? 0}
            </div>
          </Card>

          <ProofVerificationPanel submissionId={id!} />

          <FeedbackSection submissionId={id!} />

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
            <p className="text-[10px] text-ink-muted mb-3">
              Approval is final — a submission can only be approved once, and the marks above are locked in as
              awarded. Check the score column before you approve.
            </p>
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
