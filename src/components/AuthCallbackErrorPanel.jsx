export function AuthCallbackErrorPanel({ error, onReturnToLogin, onReturnHome }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl rounded-lg border border-rose-300/30 bg-slate-950/90 p-8 shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-300">
          Sign-in failed
        </p>

        <h1 className="mt-4 text-3xl font-black text-white">{error.message}</h1>

        {error.code ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-slate-200">
            Supabase error code: {error.code}
          </p>
        ) : null}

        {error.hint ? (
          <p className="mt-4 text-sm leading-6 text-slate-300">{error.hint}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReturnToLogin}
            className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
          >
            Return to login
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:border-white/40"
          >
            Go to home
          </button>
        </div>
      </div>
    </div>
  );
}
