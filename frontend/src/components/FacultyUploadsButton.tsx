import { useState } from 'react';
import { FolderOpen, X } from 'lucide-react';
import ProofVerificationPanel from './ProofVerificationPanel';

// Reports action: opens a faculty's uploads grouped by section. HoD/incharge can
// verify/reject each upload from here; everyone else sees it read-only (the panel
// self-gates the buttons by role).
export default function FacultyUploadsButton({ submissionId, facultyName }: { submissionId: string; facultyName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium"
      >
        <FolderOpen size={13} /> Uploads
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative bg-surface-base rounded-lg shadow-xl w-full max-w-2xl z-10 mt-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <h3 className="text-sm font-semibold text-ink-primary">Uploads — {facultyName}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-surface-muted text-ink-secondary" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <ProofVerificationPanel submissionId={submissionId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
