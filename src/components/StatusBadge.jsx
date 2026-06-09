import clsx from 'clsx';

const badgeStyles = {
  upcoming: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  live: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  finished: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-200',
  correct: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  wrong: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  predicted: 'border-gold-300/30 bg-gold-300/10 text-gold-300',
  locked: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  neutral: 'border-white/15 bg-white/5 text-slate-300',
};

export function StatusBadge({ label, tone = 'neutral' }) {
  const key = label?.toLowerCase?.().replace(/\s+/g, '-') ?? tone;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide',
        badgeStyles[key] ?? badgeStyles[tone] ?? badgeStyles.neutral,
      )}
    >
      {label}
    </span>
  );
}
