import { Trophy } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-gold-300" />
          <span>CupPredict 2026</span>
        </div>
        <p>Original fan prediction platform. Not affiliated with any official tournament brand.</p>
      </div>
    </footer>
  );
}
