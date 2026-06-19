import { useRef, useState } from 'react';
import { Upload, FileText, X, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadApi } from '../api/uploads';

interface Props {
  value: string | null | undefined;          // current file URL
  onChange: (url: string | null) => void;
  readOnly?: boolean;
  accept?: string;
  label?: string;
}

const DEFAULT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';

function fileName(url: string): string {
  // strip uuid prefix "<uuid>-name.ext" → "name.ext"
  const base = url.split('/').pop() ?? url;
  const dash = base.indexOf('-', 36); // uuid is 36 chars
  return dash > 0 ? base.slice(dash + 1) : base;
}

export default function FileUpload({ value, onChange, readOnly, accept = DEFAULT_ACCEPT, label }: Props) {
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    setUploading(true);
    setPct(0);
    try {
      const res = await uploadApi.uploadProof(file, setPct);
      onChange(res.url);
      toast.success('Proof uploaded');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    const url = value;
    onChange(null);
    if (url) uploadApi.deleteProof(url).catch(() => {}); // best-effort
  };

  // Open the proof via the authenticated route (not a direct URL).
  const openProof = async () => {
    if (!value) return;
    try {
      const objectUrl = await uploadApi.viewProof(value);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (e: any) {
      toast.error(e?.response?.status === 403 ? 'Not authorized to view this file' : 'Could not open file');
    }
  };

  // Read-only: just a view link (or dash)
  if (readOnly) {
    if (!value) return <span className="text-xs text-ink-subtle">—</span>;
    return (
      <button type="button" onClick={openProof}
         className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
        <Eye size={11} /> View proof
      </button>
    );
  }

  // Uploaded state
  if (value && !uploading) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <FileText size={13} className="text-primary-600 shrink-0" />
        <button type="button" onClick={openProof}
           className="text-primary-600 hover:underline truncate max-w-[140px] text-left" title={fileName(value)}>
          {fileName(value)}
        </button>
        <button type="button" onClick={remove} className="text-danger-500 hover:text-red-700 shrink-0" title="Remove">
          <X size={13} />
        </button>
      </div>
    );
  }

  // Uploading
  if (uploading) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Loader2 size={13} className="animate-spin" /> Uploading {pct}%
      </div>
    );
  }

  // Empty — upload button
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-xs border border-surface-border rounded px-2.5 py-1 text-ink-secondary hover:bg-surface-muted hover:border-primary-300"
      >
        <Upload size={12} /> {label ?? 'Upload proof'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
      />
    </div>
  );
}
