import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function TeamPicker({ disabled = false, helperText, label, name, onChange, teams, value }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const selectedTeam = teams.find((team) => team === value) ?? '';

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return teams;
    return teams.filter((team) => team.toLowerCase().includes(normalizedQuery));
  }, [query, teams]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const chooseTeam = (team) => {
    onChange(team);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative block min-w-0">
      <input type="hidden" name={name} value={selectedTeam} />
      <span className="text-sm font-bold text-slate-300">{label}</span>
      <button
        type="button"
        disabled={disabled || !teams.length}
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-left text-white outline-none transition hover:border-emerald-300/60 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={selectedTeam ? 'truncate' : 'truncate text-slate-400'}>
          {selectedTeam || 'Choose a team'}
        </span>
        <ChevronDown size={18} className={open ? 'shrink-0 rotate-180 transition' : 'shrink-0 transition'} />
      </button>

      {helperText ? <span className="mt-2 block text-xs leading-5 text-slate-400">{helperText}</span> : null}

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-emerald-300/30 bg-slate-950 shadow-2xl ring-1 ring-black/40">
          <label className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-slate-400">
            <Search size={16} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Search teams"
            />
          </label>
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredTeams.length ? (
              filteredTeams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => chooseTeam(team)}
                  className={`block w-full px-4 py-2.5 text-left text-sm font-bold transition ${
                    team === selectedTeam
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'text-slate-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {team}
                </button>
              ))
            ) : (
              <p className="px-4 py-4 text-sm text-slate-400">No teams found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
