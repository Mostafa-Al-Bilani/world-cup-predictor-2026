import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { TeamDirectoryCard } from "../components/team/TeamDirectoryCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { MATCHES_UPDATED_EVENT } from "../hooks/useLiveMatchNotifications.js";
import { teamService } from "../services/teamService.js";
import { getSafeErrorMessage } from "../utils/errors.js";
import { getTeamLiveMatchSummary } from "../utils/teamDirectoryLive.js";
import { getTeamTournamentStatus } from "../utils/teamMatchOrdering.js";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "qualified", label: "Qualified" },
  { value: "eliminated", label: "Eliminated" },
];

const controlClassName =
  "h-11 w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-emerald-300";

export function TeamsPage() {
  const { user, isAuthenticated } = useAuth();
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [matchRows, summaries] = await Promise.all([
          teamService.getMatches(),
          teamService.getDirectorySummaries({ userId: user?.id }),
        ]);

        if (cancelled) return;

        setMatches(matchRows);
        setTeams(summaries);
      } catch (loadError) {
        if (!cancelled) {
          setTeams([]);
          setError(getSafeErrorMessage(loadError, "Could not load teams."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const handleMatchesUpdated = (event) => {
      if (Array.isArray(event.detail?.matches)) {
        setMatches(event.detail.matches);
      }
    };

    window.addEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);

    return () => {
      window.removeEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);
    };
  }, []);

  const groupOptions = useMemo(() => {
    const groups = new Set(teams.map((team) => team.group).filter(Boolean));
    return ["all", ...[...groups].sort()];
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return teams.filter((team) => {
      if (
        normalizedQuery &&
        !team.name.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (groupFilter !== "all" && team.group !== groupFilter) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      const status = getTeamTournamentStatus({
        matches,
        team: team.name,
      });

      if (!status) {
        return statusFilter === "active";
      }

      return status.toLowerCase() === statusFilter;
    });
  }, [teams, matches, searchQuery, groupFilter, statusFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    groupFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setGroupFilter("all");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
        <LoadingSpinner label="Loading teams..." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
          Teams
        </p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
          Explore every team&apos;s{" "}
          <span className="text-emerald-200">World Cup journey</span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400 sm:text-base">
          Results, upcoming fixtures, goals, and how your predictions performed
          for each team.
        </p>
      </header>

      <section className="mt-6 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_minmax(0,0.7fr)] lg:items-end">
          <label className="relative block min-w-0">
            <span className="sr-only">Search teams</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search teams"
              aria-label="Search teams"
              className={`${controlClassName} pl-10`}
            />
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Group
            </span>
            <select
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
              aria-label="Filter by group"
              className={controlClassName}
            >
              {groupOptions.map((group) => (
                <option key={group} value={group}>
                  {group === "all" ? "All groups" : group}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by tournament status"
              className={controlClassName}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <p className="text-sm text-slate-400">
            <span className="font-black text-white">{filteredTeams.length}</span>{" "}
            {filteredTeams.length === 1 ? "team" : "teams"}
            {hasActiveFilters ? (
              <span className="text-slate-500"> · filtered</span>
            ) : null}
          </p>

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-emerald-300/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              <X size={14} aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {!filteredTeams.length ? (
        <div className="mt-8">
          <EmptyState
            title="No teams found"
            description="Try another search term or filter."
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1536px]:grid-cols-4 [&>*]:min-w-0">
          {filteredTeams.map((team) => (
            <TeamDirectoryCard
              key={team.slug}
              team={team}
              liveSummary={getTeamLiveMatchSummary(matches, team.name)}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}
    </main>
  );
}
