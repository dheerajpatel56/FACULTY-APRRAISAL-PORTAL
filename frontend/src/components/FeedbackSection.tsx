import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageSquare, Save, Send, CheckCircle2, XCircle } from 'lucide-react';
import Card from './Card';
import { feedbackApi, type FeedbackResponse, type FeedbackSnapshot } from '../api/feedback';

function SnapshotSummary({ s }: { s: FeedbackSnapshot }) {
  return (
    <div className="rounded border border-surface-border bg-surface-muted/40 p-3 text-xs space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span><span className="text-ink-muted">Cadre:</span> <span className="font-medium text-ink-primary">{s.cadreLabel ?? '—'}</span></span>
        <span className="inline-flex items-center gap-1">
          <span className="text-ink-muted">Meets ideal targets:</span>
          {s.eligible ? <CheckCircle2 size={13} className="text-emerald-600" /> : <XCircle size={13} className="text-red-500" />}
        </span>
      </div>
      {s.scores && (
        <div className="text-ink-secondary">
          <span className="text-ink-muted">Self-appraisal:</span> C1 {s.scores.cat1.toFixed(1)} · C2 {s.scores.cat2.toFixed(1)} · C3 {s.scores.cat3.toFixed(1)} · C4 {s.scores.cat4.toFixed(1)} · C5 {s.scores.cat5.toFixed(1)} ·
          <span className="font-semibold text-primary-700"> Total {s.scores.total.toFixed(1)} / 500</span>
        </div>
      )}
      {s.requirements?.length > 0 && (
        <div>
          <div className="text-ink-muted mb-1">Ideal targets</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {s.requirements.map((r) => (
              <span key={r.key} className="inline-flex items-center gap-1 text-ink-secondary">
                {r.met ? <CheckCircle2 size={11} className="text-emerald-600" /> : <XCircle size={11} className="text-red-500" />}
                {r.label} <span className="text-ink-muted">{r.target}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedbackSection({ submissionId }: { submissionId: string }) {
  const [data, setData] = useState<FeedbackResponse | null>(null);
  const [form, setForm] = useState({ strengths: '', improvements: '', growthTargets: '' });
  const [busy, setBusy] = useState(false);

  // True when the editor was pre-filled from the auto-generated draft (no HoD
  // narrative saved yet) — drives the "auto-drafted" hint.
  const [autofilled, setAutofilled] = useState(false);

  const load = () =>
    feedbackApi.get(submissionId).then((d) => {
      setData(d);
      const saved = d.feedback && (d.feedback.strengths || d.feedback.improvements || d.feedback.growthTargets);
      if (saved) {
        setForm({
          strengths: d.feedback!.strengths ?? '',
          improvements: d.feedback!.improvements ?? '',
          growthTargets: d.feedback!.growthTargets ?? '',
        });
        setAutofilled(false);
      } else if (d.suggested) {
        // Auto-generated draft — HoD edits or issues with one click.
        setForm({ ...d.suggested });
        setAutofilled(true);
      }
    }).catch(() => toast.error('Failed to load feedback'));

  useEffect(() => { load(); }, [submissionId]);

  if (!data) return null;

  const { feedback, autoSnapshot, editable } = data;
  const snapshot = feedback?.snapshot ?? autoSnapshot ?? null;

  const save = async (issue: boolean) => {
    if (issue && !confirm('Issue this feedback to the faculty? They will be notified and can view it.')) return;
    setBusy(true);
    try {
      if (issue) await feedbackApi.issue(submissionId, form);
      else await feedbackApi.save(submissionId, form);
      toast.success(issue ? 'Feedback issued' : 'Draft saved');
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full border border-surface-border rounded px-3 py-2 text-sm bg-surface-base focus:outline-none focus:ring-2 focus:ring-primary-500';

  // Faculty (read-only) with nothing issued yet.
  if (!editable && !feedback) {
    return (
      <Card>
        <h2 className="text-sm font-semibold text-ink-primary mb-1 font-serif flex items-center gap-2"><MessageSquare size={15} className="text-primary-600" /> Feedback</h2>
        <p className="text-xs text-ink-muted">No feedback has been issued yet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-accent-500/30">
        <h2 className="text-sm font-semibold text-ink-primary font-serif flex items-center gap-2">
          <MessageSquare size={15} className="text-primary-600" /> {editable ? 'Feedback' : 'Your Feedback'}
        </h2>
        {feedback && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${feedback.status === 'ISSUED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {feedback.status}{feedback.status === 'ISSUED' && feedback.issuedBy ? ` · ${feedback.issuedBy.name}` : ''}
          </span>
        )}
      </div>

      {/* Cadre / eligibility / target snapshot is for editors (HoD/admin) only —
          faculty must never see the tier/eligibility internals. */}
      {editable && snapshot && <div className="mb-3"><SnapshotSummary s={snapshot} /></div>}

      {editable ? (
        <div className="space-y-3">
          {autofilled && (
            <p className="text-xs text-primary-700 bg-primary-50 border border-primary-200 rounded px-3 py-2">
              Auto-drafted from this faculty's targets. Edit if needed, or issue as-is with one click.
            </p>
          )}
          {([['strengths', 'Strengths'], ['improvements', 'Areas to improve'], ['growthTargets', 'Growth targets (next cycle)']] as const).map(([k, label]) => (
            <div key={k}>
              <label className="block text-xs font-medium text-ink-secondary mb-1">{label}</label>
              <textarea rows={2} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inputCls} />
            </div>
          ))}
          <div className="flex gap-2 justify-end">
            <button onClick={() => save(false)} disabled={busy} className="inline-flex items-center gap-2 text-sm border border-surface-border px-4 py-2 rounded hover:bg-surface-muted disabled:opacity-50">
              <Save size={15} /> Save draft
            </button>
            <button onClick={() => save(true)} disabled={busy} className="inline-flex items-center gap-2 text-sm bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50">
              <Send size={15} /> Issue to faculty
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {([['strengths', 'Strengths'], ['improvements', 'Areas to improve'], ['growthTargets', 'Growth targets']] as const).map(([k, label]) => (
            <div key={k}>
              <div className="text-xs font-medium text-ink-secondary mb-0.5">{label}</div>
              <div className="text-ink-primary whitespace-pre-wrap">{feedback?.[k] || <span className="text-ink-muted">—</span>}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
