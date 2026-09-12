import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Eye, Loader2 } from 'lucide-react';
import Card from './Card';
import FileUpload from './FileUpload';
import { uploadApi } from '../api/uploads';
import { verificationApi, type ProofListResponse, type ProofRow } from '../api/verification';

// The faculty's side of a rejected proof. While the appraisal is on hold they
// may swap each rejected proof for a corrected file or link, up to the
// correction deadline. A proof still rejected at the deadline costs its
// subsection the marks (backend cron/proofDeadline), and this card says so.
export default function RejectedProofsCard({ submissionId, onChanged }: { submissionId: string; onChanged?: () => void }) {
  const [data, setData] = useState<ProofListResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    verificationApi.listProofs(submissionId).then(setData).catch(() => setData(null));
  }, [submissionId]);

  useEffect(() => { load(); }, [load]);

  if (!data) return null;
  const rejected = data.proofs.filter((p) => p.status === 'REJECTED');
  if (rejected.length === 0) return null;

  const deadline = data.submission.proofDeadlineAt ? new Date(data.submission.proofDeadlineAt) : null;
  const expired = !!deadline && deadline.getTime() <= Date.now();
  const open = data.submission.status === 'HOLD' && !expired;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000)) : null;
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const replace = async (p: ProofRow, newUrl: string | null) => {
    if (!newUrl) return;
    setBusy(p.url);
    try {
      await verificationApi.replaceProof(submissionId, p.url, newUrl);
      toast.success('Proof replaced and sent back for verification');
      load();
      onChanged?.();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Could not replace the proof');
    } finally {
      setBusy(null);
    }
  };

  const view = async (url: string) => {
    if (!url.includes('/uploads/')) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const objectUrl = await uploadApi.viewProof(url);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      toast.error('Could not open file');
    }
  };

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-200">
        <AlertTriangle size={15} className="text-red-600" />
        <h2 className="text-sm font-semibold text-red-700 font-serif">Rejected proofs — action needed</h2>
      </div>

      {open ? (
        <p className="text-xs text-ink-secondary mb-3">
          Replace each rejected proof{deadline ? <> by <span className="font-semibold">{fmt(deadline)}</span> ({daysLeft} day{daysLeft === 1 ? '' : 's'} left)</> : ''}.
          A proof not replaced in time loses that subsection's marks.
        </p>
      ) : expired ? (
        <p className="text-xs text-red-700 mb-3">
          The correction deadline{deadline ? ` (${fmt(deadline)})` : ''} has passed. The marks for the subsections below were cut.
        </p>
      ) : (
        <p className="text-xs text-ink-secondary mb-3">These proofs were rejected and not replaced.</p>
      )}

      <div className="space-y-2">
        {rejected.map((p) => (
          <div key={p.id} className="rounded border border-red-200 bg-red-50/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-muted uppercase tracking-wider">{p.section}</span>
              <span className="font-medium text-ink-primary truncate max-w-[260px]" title={p.item}>{p.item}</span>
              <span className="text-ink-muted">· {p.field}</span>
              <button onClick={() => view(p.url)} className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                <Eye size={12} /> View rejected
              </button>
            </div>
            {p.comment && <div className="mt-1 text-red-700">Reviewer: {p.comment}</div>}
            {open && (
              <div className="mt-2">
                {busy === p.url ? (
                  <span className="inline-flex items-center gap-1 text-ink-muted"><Loader2 size={12} className="animate-spin" /> Replacing…</span>
                ) : (
                  <FileUpload value={null} onChange={(url) => replace(p, url)} label="Upload corrected proof" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
