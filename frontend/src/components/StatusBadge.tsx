interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, string> = {
  DRAFT:              'bg-surface-muted text-ink-muted border-surface-border',
  SUBMITTED:          'bg-primary-50 text-primary-700 border-primary-200',
  UNDER_REVIEW:       'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED:           'bg-red-50 text-red-700 border-red-200',
  REVISION_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200',
  ACTIVE:             'bg-emerald-50 text-emerald-700 border-emerald-200',
  REVIEWED:           'bg-primary-50 text-primary-600 border-primary-200',
  PENDING:            'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED:          'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const fallback = 'bg-surface-muted text-ink-muted border-surface-border';

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles = statusStyles[status] ?? fallback;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-semibold uppercase tracking-wider border rounded ${sizeClass} ${styles}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
