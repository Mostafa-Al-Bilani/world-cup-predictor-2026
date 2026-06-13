import { ChevronDown, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TeamFlag } from './TeamFlag';

const SEARCH_ROW_HEIGHT = 54;
const PANEL_MARGIN = 14;
const MAX_LIST_HEIGHT = 260;
const MIN_LIST_HEIGHT = 132;

export function TeamPicker({ disabled = false, helperText, label, name, onChange, teams, value }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState({ listMaxHeight: MAX_LIST_HEIGHT, opensUpward: false });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const selectedTeam = teams.find((team) => team === value) ?? '';

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return teams;
    return teams.filter((team) => team.toLowerCase().includes(normalizedQuery));
  }, [query, teams]);

  const measurePlacement = useCallback(() => {
    if (!dropdownRef.current) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_MARGIN;
    const spaceAbove = rect.top - PANEL_MARGIN;
    const opensUpward = spaceBelow < MAX_LIST_HEIGHT + SEARCH_ROW_HEIGHT && spaceAbove > spaceBelow;
    const availableSpace = opensUpward ? spaceAbove : spaceBelow;
    const listMaxHeight = Math.max(
      MIN_LIST_HEIGHT,
      Math.min(MAX_LIST_HEIGHT, availableSpace - SEARCH_ROW_HEIGHT),
    );

    setPlacement({ listMaxHeight, opensUpward });
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    measurePlacement();
    window.addEventListener('resize', measurePlacement);
    window.addEventListener('scroll', measurePlacement, true);

    return () => {
      window.removeEventListener('resize', measurePlacement);
      window.removeEventListener('scroll', measurePlacement, true);
    };
  }, [measurePlacement, open]);

  const chooseTeam = (team) => {
    onChange(team);
    setQuery('');
    setOpen(false);
  };

  const toggleOpen = () => {
    setOpen((current) => {
      const nextOpen = !current;
      if (nextOpen) window.requestAnimationFrame(measurePlacement);
      return nextOpen;
    });
  };

  return (
    <div ref={containerRef} className="relative block min-w-0">
      <input type="hidden" name={name} value={selectedTeam} />
      <span className="text-sm font-bold text-slate-300">{label}</span>

      <div ref={dropdownRef} className="relative mt-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || !teams.length}
          onClick={toggleOpen}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-left text-white outline-none transition hover:border-emerald-300/60 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={
              selectedTeam ? 'flex min-w-0 items-center gap-2 truncate' : 'flex min-w-0 items-center gap-2 truncate text-slate-400'
            }
          >
            {selectedTeam ? <TeamFlag size="sm" teamName={selectedTeam} /> : null}
            <span className="truncate">{selectedTeam || 'Choose a team'}</span>
          </span>
          <ChevronDown size={18} className={open ? 'shrink-0 rotate-180 transition' : 'shrink-0 transition'} />
        </button>

        {open ? (
          <div
            className={`absolute left-0 right-0 z-50 overflow-hidden rounded-lg border border-emerald-300/30 bg-slate-950 shadow-2xl ring-1 ring-black/40 ${
              placement.opensUpward ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <label className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-slate-400">
              <Search size={16} />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search teams"
                className="w-full bg-transparent py-1 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Search teams"
              />
            </label>
            <div className="overflow-y-auto py-1" style={{ maxHeight: placement.listMaxHeight }}>
              {filteredTeams.length ? (
                filteredTeams.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => chooseTeam(team)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition ${
                      team === selectedTeam
                        ? 'bg-emerald-300 text-emerald-950'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <TeamFlag size="sm" teamName={team} />
                    <span className="truncate">{team}</span>
                  </button>
                ))
              ) : (
                <p className="px-4 py-4 text-sm text-slate-400">No teams found.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {helperText ? <span className="mt-2 block text-xs leading-5 text-slate-400">{helperText}</span> : null}
    </div>
  );
}
