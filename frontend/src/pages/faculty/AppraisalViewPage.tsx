import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appraisalApi } from '../../api/appraisals';
import toast from 'react-hot-toast';
import { CheckCircle, Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';

export default function AppraisalViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      appraisalApi.get(id!),
      appraisalApi.getScore(id!),
    ]).then(([sub, sc]) => {
      setSubmission(sub);
      setScore(sc);
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [id]);

  const downloadPdf = async () => {
    try {
      const blob = await appraisalApi.downloadPdf(id!);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appraisal-${submission?.user?.employeeCode ?? id}-${submission?.academicYear?.label ?? ''}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('PDF download failed');
    }
  };

  const handleWithdraw = async () => {
    try {
      await appraisalApi.withdraw(id!);
      toast.success('Withdrawn');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed');
    }
  };

  if (loading) return <div className="text-sm text-ink-muted">Loading...</div>;
  if (!submission) return <div className="text-sm text-danger-500">Not found</div>;

  const review = submission.review;

  return (
    <div className="max-w-4xl">
      {/* Print-only institute header */}
      <div className="print-only" style={{ textAlign: 'center', marginBottom: '12pt', borderBottom: '2pt solid #000', paddingBottom: '8pt' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>VALLURUPALLI NAGESWARA RAO VIGNANA JYOTHI</div>
        <div style={{ fontSize: '11pt' }}>INSTITUTE OF ENGINEERING &amp; TECHNOLOGY</div>
        <div style={{ fontSize: '9pt', marginTop: '2pt' }}>NAAC A++ · NBA Accredited · Autonomous Institution</div>
        <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '8pt' }}>
          Faculty Appraisal — Submission #{submission.submissionNumber} · {submission.academicYear?.label}
        </div>
      </div>

      <PageHeader
        title={`Submission #${submission.submissionNumber} — ${submission.academicYear?.label}`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Appraisals', to: '/dashboard' },
          { label: `#${submission.submissionNumber}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={submission.status} size="md" />
            <button onClick={downloadPdf} className="flex items-center gap-1 text-sm border border-surface-border px-3 py-1.5 rounded hover:bg-surface-muted">
              <Download size={14} /> PDF
            </button>
            {submission.status === 'SUBMITTED' && (
              <button onClick={handleWithdraw} className="text-sm text-danger-500 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50">
                Withdraw
              </button>
            )}
            {submission.status === 'DRAFT' && (
              <button onClick={() => navigate(`/appraisal/${id}/edit`)} className="text-sm bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-700">
                Edit
              </button>
            )}
          </div>
        }
      />

      {/* Score Summary */}
      {score && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-ink-primary mb-3">Self-Appraisal Score</h2>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Teaching', val: score.cat1.total, max: 150 },
              { label: 'Research', val: score.cat2.total, max: 150 },
              { label: 'Development', val: score.cat3.total, max: 100 },
              { label: 'Governance', val: score.cat4.total, max: 50 },
              { label: 'Supplementary', val: score.cat5.total, max: 50 },
            ].map(({ label, val, max }) => (
              <div key={label} className="bg-surface-muted rounded p-3 text-center">
                <div className="text-lg font-bold text-primary-700">{val.toFixed(1)}</div>
                <div className="text-xs text-ink-muted">{label}</div>
                <div className="text-xs text-ink-subtle">/ {max}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <span className="text-sm font-medium text-ink-secondary">Total: </span>
            <span className="text-lg font-bold text-primary-600">{score.selfTotal.toFixed(1)}</span>
            <span className="text-sm text-ink-subtle"> / 500</span>
          </div>
        </Card>
      )}

      {/* Reviewer Comments */}
      {review && (review.overallComment || review.teachingComment) && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-success-500" />
            <h2 className="text-sm font-semibold text-ink-primary">Reviewer Feedback</h2>
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Teaching', review.teachingComment],
              ['Research', review.researchComment],
              ['Development', review.developmentComment],
              ['Governance', review.governanceComment],
              ['Supplementary', review.supplementaryComment],
              ['Overall', review.overallComment],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <span className="font-medium text-ink-secondary">{k}: </span>
                <span className="text-ink-primary">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status notice */}
      {['SUBMITTED', 'UNDER_REVIEW'].includes(submission.status) && (
        <div className="bg-primary-50 border border-primary-200 rounded p-3 text-sm text-primary-700">
          Your submission is under review. Reviewer feedback will be visible once the review is complete.
        </div>
      )}
    </div>
  );
}
