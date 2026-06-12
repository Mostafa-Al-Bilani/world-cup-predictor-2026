import clsx from "clsx";

export function PredictionButton({
  label,
  selected,
  disabled = false,
  readOnly = false,
  onClick,
}) {
  const isDisabled = disabled || readOnly;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={readOnly ? undefined : onClick}
      className={clsx(
        "inline-flex max-w-full items-center justify-center rounded-full border px-4 py-2 text-sm font-black transition",
        selected
          ? "border-emerald-300 bg-emerald-300 text-emerald-950 shadow-glow"
          : "border-white/15 bg-white/5 text-slate-200",
        !isDisabled &&
          !selected &&
          "hover:border-emerald-300 hover:text-white",
        disabled &&
          !readOnly &&
          "cursor-not-allowed opacity-55 hover:border-white/15",
        readOnly && "cursor-default",
      )}
    >
      {label}
    </button>
  );
}