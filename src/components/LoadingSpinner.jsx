export function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex justify-center">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-200">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          {label}
        </div>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
