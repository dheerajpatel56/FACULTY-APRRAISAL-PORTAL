interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ className = '', width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`bg-surface-muted animate-pulse rounded ${className}`}
      style={style}
    />
  );
}

// Convenience presets

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface-card border border-surface-border rounded-md p-5 ${className}`}>
      <Skeleton width="40%" height={16} className="mb-3" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonStatTile() {
  return (
    <div className="bg-surface-card border border-surface-border rounded-md p-4 flex items-center gap-3">
      <Skeleton width={36} height={36} />
      <div className="flex-1 space-y-1.5">
        <Skeleton width="60%" height={10} />
        <Skeleton width="40%" height={18} />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={12} width={i === 0 ? '70%' : i === cols - 1 ? '40%' : '85%'} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-md overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-muted">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-2.5">
                <Skeleton height={10} width="60%" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
