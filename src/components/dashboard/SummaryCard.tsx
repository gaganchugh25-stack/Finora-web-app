import type { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
  label: string;
  value: string;
  context: string;
  icon: LucideIcon;
  tone?: 'primary' | 'danger' | 'blue';
}

const toneClasses = {
  primary: 'bg-[var(--soft-primary)] text-[var(--primary-strong)]',
  danger: 'bg-[var(--soft-danger)] text-[var(--danger)]',
  blue: 'bg-[var(--soft-blue)] text-[var(--info)]',
};

export function SummaryCard({ label, value, context, icon: Icon, tone = 'primary' }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted-ink)]">
        <span>{label}</span>
        <span className={`grid size-9 place-items-center rounded-xl ${toneClasses[tone]}`}><Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} /></span>
      </div>
      <p className="mt-4 text-[clamp(1.45rem,2.2vw,1.9rem)] font-bold tracking-[-0.035em] tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted-ink)]">{context}</p>
    </article>
  );
}
