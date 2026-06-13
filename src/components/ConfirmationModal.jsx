import { useEffect, useId, useRef, useState } from "react";

export function ConfirmationModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);
  const cancelButtonRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !busy) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    if (busy) return;

    setBusy(true);

    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur"
    >
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <h2 id={titleId} className="text-2xl font-black text-white">
          {title}
        </h2>
        <p id={descriptionId} className="mt-3 text-sm text-slate-300">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="rounded-full bg-rose-400 px-4 py-2 text-sm font-black text-rose-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
