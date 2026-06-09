import { AlertTriangle } from 'lucide-react';
import { getSupabaseConfigurationMessage, requiredSupabaseEnvVars } from '../services/supabaseClient';

export function ConfigurationErrorPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
        <div className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-6 shadow-2xl sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-rose-300 text-rose-950">
              <AlertTriangle size={24} />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-200">Production setup required</p>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">Supabase is not configured.</h1>
              <p className="mt-4 text-slate-200">{getSupabaseConfigurationMessage()}</p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-slate-950/70 p-4">
            <p className="text-sm font-bold text-slate-200">Required GitHub repository secrets or variables:</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {requiredSupabaseEnvVars.map((name) => (
                <li key={name} className="rounded bg-white/5 px-3 py-2 font-mono text-emerald-200">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-sm text-slate-300">
            Local development can still use demo storage by running a non-production Vite dev server without these values.
            Public GitHub Pages builds require Supabase and never use localStorage demo accounts or predictions.
          </p>
        </div>
      </section>
    </main>
  );
}
