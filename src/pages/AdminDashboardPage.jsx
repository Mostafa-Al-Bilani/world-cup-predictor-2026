import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Activity,
  CalendarCheck,
  CalendarClock,
  Goal,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { AdminMatchForm } from "../components/AdminMatchForm";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { EmptyState } from "../components/EmptyState";
import { FilterDropdown } from "../components/FilterDropdown";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { fixtureSyncService } from "../services/fixtureSyncService";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";
import { profileService } from "../services/profileService";
import { stagePredictionService } from "../services/stagePredictionService";
import { syncLogService } from "../services/syncLogService";
import { formatDateTime } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import { normalizeMatchDisplayStatus } from "../utils/matchDisplay";

const adminStatusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "halftime", label: "Halftime" },
  { value: "finished", label: "Finished" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
];

export function AdminDashboardPage() {
  const { isSupabaseConfigured } = useAuth();
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState(null);
  const [latestSyncLog, setLatestSyncLog] = useState(null);
  const [stageSummary, setStageSummary] = useState([]);
  const [recalculatingStages, setRecalculatingStages] = useState(false);
  const [matchSearch, setMatchSearch] = useState("");
  const [matchStatusFilter, setMatchStatusFilter] = useState("all");

  const load = async () => {
    setLoading(true);

    try {
      const [matchRows, statRows, syncLog] = await Promise.all([
        matchService.getMatches(),
        profileService.getAdminStats(),
        syncLogService.getLatestAdminSyncLog().catch(() => null),
      ]);

      const bracketSummary = await stagePredictionService
        .getAdminSummary(matchRows)
        .catch(() => []);

      setMatches(matchRows);
      setStats(statRows);
      setLatestSyncLog(syncLog);
      setStageSummary(bracketSummary);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not load admin dashboard."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleMatches = useMemo(() => {
    const query = matchSearch.trim().toLowerCase();

    return matches.filter((match) => {
      const statusMatches =
        matchStatusFilter === "all" ||
        normalizeMatchDisplayStatus(match.status) === matchStatusFilter;

      const queryMatches =
        !query ||
        [
          match.team_a,
          match.team_b,
          match.stage,
          match.venue,
          match.city,
          String(match.match_number ?? ""),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return statusMatches && queryMatches;
    });
  }, [matchSearch, matchStatusFilter, matches]);

  const saveMatch = async (payload) => {
    setSaving(true);

    try {
      const saved = await matchService.saveMatch(payload);

      if (saved.status === "finished" && saved.result) {
        await predictionService.recalculateMatch(saved.id);
      }

      toast.success(
        saved.status === "finished"
          ? "Match saved and points recalculated."
          : "Match saved.",
      );

      setSelectedMatch(null);
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not save match."));
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async () => {
    try {
      await matchService.deleteMatch(deleteTarget.id);
      toast.success("Match deleted.");
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not delete match."));
    }
  };

  const recalculate = async (match) => {
    try {
      await predictionService.recalculateMatch(match.id);
      toast.success("Points recalculated from predictions.");
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not recalculate points."));
    }
  };

  const syncFixtures = async () => {
    setSyncing(true);
    setSyncSummary(null);

    try {
      const summary = await fixtureSyncService.syncOpenFootballFixtures();
      setSyncSummary(summary);

      if (summary.failed_count) {
        toast.error(
          `Fixture sync finished with ${summary.failed_count} failed recalculation.`,
        );
      } else {
        toast.success(
          `Fixture sync complete: ${summary.inserted} inserted, ${summary.updated} updated.`,
        );
      }

      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not sync fixtures."));
    } finally {
      setSyncing(false);
    }
  };

  const recalculateStagePredictions = async () => {
    setRecalculatingStages(true);

    try {
      const updatedCount =
        await stagePredictionService.recalculateStagePredictions();

      toast.success(
        `Bracket scoring recalculated for ${updatedCount ?? 0} prediction rows.`,
      );

      await load();
    } catch (error) {
      toast.error(
        getSafeErrorMessage(
          error,
          "Could not recalculate bracket predictions.",
        ),
      );
    } finally {
      setRecalculatingStages(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading admin controls" />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Protected operations
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Admin Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Manage fixtures, finish matches, enter results, run the openfootball
            fallback sync, and recalculate scores.
          </p>
        </div>

        <button
          type="button"
          onClick={syncFixtures}
          disabled={syncing || !isSupabaseConfigured}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={syncing ? "animate-spin" : undefined}
          />
          {syncing ? "Syncing fixtures..." : "Sync Fixtures"}
        </button>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Fixture sync is disabled in local demo mode. Configure Supabase
          locally to import openfootball data into the database.
        </div>
      ) : null}

      {syncSummary ? (
        <div className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          Synced {syncSummary.total} fixtures from {syncSummary.provider_used}:{" "}
          {syncSummary.inserted} inserted, {syncSummary.updated} updated,{" "}
          {syncSummary.unchanged} unchanged, {syncSummary.recalculated_count}{" "}
          recalculated.
        </div>
      ) : null}

      {latestSyncLog ? <SyncLogCard log={latestSyncLog} /> : null}

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Users} label="Users" value={stats.totalUsers} />
          <StatCard
            icon={CalendarCheck}
            label="Matches"
            value={stats.totalMatches}
          />
          <StatCard
            icon={Goal}
            label="Predictions"
            value={stats.totalPredictions}
          />
          <StatCard
            icon={Trophy}
            label="Brackets"
            value={stats.totalStagePredictions ?? 0}
          />
          <StatCard
            icon={Activity}
            label="Finished"
            value={stats.finishedMatches}
          />
          <StatCard
            icon={CalendarClock}
            label="Upcoming"
            value={stats.upcomingMatches}
          />
        </section>
      ) : null}

      <section className="mt-8 rounded-lg border border-white/10 bg-slate-950/72 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Bracket scoring
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Stage prediction status
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Submissions are locked by first kickoff for each stage.
              Recalculation only scores stages whose actual teams are known from
              synced fixtures.
            </p>
          </div>

          <button
            type="button"
            onClick={recalculateStagePredictions}
            disabled={recalculatingStages || !isSupabaseConfigured}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gold-300/40 px-5 py-3 text-sm font-black text-gold-100 transition hover:bg-gold-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={recalculatingStages ? "animate-spin" : undefined}
            />
            {recalculatingStages ? "Recalculating..." : "Recalculate Brackets"}
          </button>
        </div>

        {stageSummary.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {stageSummary.map((stage) => (
              <div
                key={stage.key}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <p className="font-black text-white">{stage.label}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {stage.requiredCount} teams, {stage.pointsPerTeam} pts each
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <MiniMetric
                    label="Submitted"
                    value={stage.submittedCount ?? 0}
                  />
                  <MiniMetric label="Scored" value={stage.scoredCount ?? 0} />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {stage.lockAt
                    ? `Locks ${formatDateTime(stage.lockAt)}`
                    : "Lock time pending"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No bracket data yet"
              description="Stage prediction status appears after the database migration is applied."
            />
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <AdminMatchForm
          match={selectedMatch}
          onSubmit={saveMatch}
          onCancel={() => setSelectedMatch(null)}
          saving={saving}
        />

        <div className="rounded-lg border border-white/10 bg-slate-950/72">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-2xl font-black">Match management</h2>
            <p className="mt-2 text-sm text-slate-400">
              Showing {visibleMatches.length} of {matches.length} matches. Use
              search and filters to scan the full fixture list.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <input
                value={matchSearch}
                onChange={(event) => setMatchSearch(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                placeholder="Search team, venue, stage, or match number"
              />

              <FilterDropdown
                name="status"
                value={matchStatusFilter}
                options={adminStatusFilterOptions}
                onChange={(event) =>
                  setMatchStatusFilter(event.target.value)
                }
              />
            </div>
          </div>

          <div className="max-h-[720px] divide-y divide-white/10 overflow-auto">
            {visibleMatches.length ? (
              visibleMatches.map((match) => (
                <article
                  key={match.id}
                  className="p-5 transition hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={match.status} />
                        <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                          {match.stage}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-white">
                        {match.team_a} vs {match.team_b}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {formatDateTime(match.match_date)} - {match.venue},{" "}
                        {match.city}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMatch(match)}
                        className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => recalculate(match)}
                        className="rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300 hover:text-emerald-950"
                      >
                        Recalculate
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(match)}
                        className="rounded-full border border-rose-300/40 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-300 hover:text-rose-950"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No matches found"
                  description="Adjust the search text or status filter to find a fixture."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {deleteTarget ? (
        <ConfirmationModal
          title="Delete match?"
          description={`This removes ${deleteTarget.team_a} vs ${deleteTarget.team_b}. Existing predictions tied to the match may also be affected by database constraints.`}
          confirmLabel="Delete match"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteMatch}
        />
      ) : null}
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <Icon size={22} className="text-emerald-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
    </article>
  );
}

function SyncLogCard({ log }) {
  const hasError =
    log.status === "error" || log.failed_count > 0 || log.error_message;

  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Latest fixture sync
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {log.provider}
            {log.fallback_used ? " fallback" : ""}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Finished {formatDateTime(log.finished_at)}
          </p>

          {hasError ? (
            <p className="mt-2 text-sm text-rose-200">
              {getSafeErrorMessage(
                log.error_message,
                "Sync completed with errors.",
              )}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <MiniMetric label="Inserted" value={log.inserted_count} />
          <MiniMetric label="Updated" value={log.updated_count} />
          <MiniMetric label="Recalculated" value={log.recalculated_count} />
          <MiniMetric label="Failed" value={log.failed_count} />
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-950/70 px-4 py-3 text-center">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
    </div>
  );
}