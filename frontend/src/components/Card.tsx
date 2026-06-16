interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const padMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' };

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`bg-surface-card border border-surface-border rounded-md shadow-sm ${padMap[padding]} ${className}`}>
      {children}
    </div>
  );
}
