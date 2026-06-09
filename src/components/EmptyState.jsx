export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
