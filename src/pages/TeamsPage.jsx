import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { TeamFlag } from "../components/TeamFlag.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { teamService } from "../services/teamService.js";
import { getSafeErrorMessage } from "../utils/errors.js";
import { getTeamTournamentStatus } from "../utils/teamMatchOrdering.js";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "qualified", label: "Qualified" },
  { value: "eliminated", label: "Eliminated" },
];

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

  const groupOptions = useMemo(() => {
    const groups = new Set(
      teams.map((team) => team.group).filter(Boolean),
    );

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

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
        <LoadingSpinner label="Loading teams..." />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
          Teams
        </p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
          Explore every team&apos;s tournament performance, fixtures, results,
          goals, and your prediction history.
        </h1>
      </header>

      <div className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search teams"
            aria-label="Search teams"
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Group
          </span>
          <select
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-emerald-300"
          >
            {groupOptions.map((group) => (
              <option key={group} value={group}>
                {group === "all" ? "All groups" : group}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Tournament state
          </span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-emerald-300"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      {!filteredTeams.length ? (
        <div className="mt-10">
          <EmptyState
            title="No teams found"
            description="Try another search term or filter."
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 min-[768px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-4 [&>*]:min-w-0">
          {filteredTeams.map((team) => (
            <article
              key={team.slug}
              className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 p-5 shadow-xl"
            >
              <div className="flex min-w-0 items-start gap-3">
                <TeamFlag teamName={team.name} size="lg" variant="premium" />
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-black text-white">
                    {team.name}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-emerald-200">
                    {team.group ?? "Tournament team"}
                  </p>
                </div>
              </div>

              <dl className="mt-5 space-y-2 text-sm text-slate-300">
                <div className="flex justify-between gap-3">
                  <dt>Played</dt>
                  <dd className="font-black text-white">{team.stats.played}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Record</dt>
                  <dd className="text-right font-bold text-white">
                    {team.stats.wins} wins · {team.stats.draws} draws ·{" "}
                    {team.stats.losses} losses
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Goals</dt>
                  <dd className="font-black text-white">
                    {team.stats.goalsFor}–{team.stats.goalsAgainst}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 border-t border-white/10 pt-4">
                {isAuthenticated ? (
                  <p className="text-sm text-slate-300">
                    Your points:{" "}
                    <span className="font-black text-gold-300">
                      {team.pointsEarned}
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    Sign in to view prediction impact
                  </p>
                )}

                <Link
                  to={`/teams/${team.slug}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950"
                >
                  View team
                  <ChevronRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
