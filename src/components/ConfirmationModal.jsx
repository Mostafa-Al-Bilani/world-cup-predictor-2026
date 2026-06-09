export function ConfirmationModal({ title, description, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 px-4 backdrop-blur">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-white">{title}</h2>
        <p className="mt-3 text-sm text-slate-300">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-rose-400 px-4 py-2 text-sm font-black text-rose-950 transition hover:bg-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
