import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}

export default function Pagination({ total, limit, offset, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(offset / limit) + 1;
  const showingFrom = total === 0 ? 0 : offset + 1;
  const showingTo = Math.min(offset + limit, total);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-surface-muted/30">
      <div className="text-xs text-ink-muted">
        Page {currentPage} of {totalPages} · Showing {showingFrom}-{showingTo} of {total.toLocaleString()}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(0)}
          disabled={offset === 0}
          className="text-xs border border-surface-border px-2 py-1.5 rounded hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          First
        </button>
        <button
          onClick={() => onChange(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="flex items-center gap-1 text-xs border border-surface-border px-3 py-1.5 rounded hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={12} /> Prev
        </button>
        <button
          onClick={() => onChange(offset + limit)}
          disabled={offset + limit >= total}
          className="flex items-center gap-1 text-xs border border-surface-border px-3 py-1.5 rounded hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <ChevronRight size={12} />
        </button>
        <button
          onClick={() => onChange((totalPages - 1) * limit)}
          disabled={offset + limit >= total}
          className="text-xs border border-surface-border px-2 py-1.5 rounded hover:bg-surface-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>
    </div>
  );
}
