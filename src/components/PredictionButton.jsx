import clsx from 'clsx';

export function PredictionButton({ label, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-full border px-4 py-2 text-sm font-black transition',
        selected
          ? 'border-emerald-300 bg-emerald-300 text-emerald-950 shadow-glow'
          : 'border-white/15 bg-white/5 text-slate-200 hover:border-emerald-300 hover:text-white',
        disabled && 'cursor-not-allowed opacity-55 hover:border-white/15',
      )}
    >
      {label}
    </button>
  );
}
