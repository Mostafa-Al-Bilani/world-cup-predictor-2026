import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { championService } from "../services/championService";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";
import { formatDateTime, isMatchLocked } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import {
  getPredictedScoreLabel,
  getPredictionLabel,
  getPredictionStatus,
  getPredictionTotalPoints,
} from "../utils/predictions";

const viewTabs = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "finished", label: "Finished" },
  { value: "all", label: "All" },
];

const resultFilters = [
  { value: "all", label: "All results" },
  { value: "correct", label: "Correct" },
  { value: "wrong", label: "Wrong" },
  { value: "pending", label: "Pending" },
];

const liveStatuses = new Set([
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

function getChampionResultLabel(championPrediction, isTournamentDecided) {
  if (!championPrediction) return "Pending";

  if (championPrediction.points_awarded === 3) {
    return "Correct +3 pts";
  }

  if (isTournamentDecided && championPrediction.points_awarded === 0) {
    return "Incorrect";
  }

  return "Pending";
}

function isFinalStage(stage) {
  const text = String(stage ?? "").toLowerCase();
  return (
    text.includes("final") &&
    !text.includes("semi") &&
    !text.includes("quarter") &&
    !text.includes("third") &&
    !text.includes("3rd")
  );
}

function getEmptyDescription(activeView, resultFilter) {
  if (activeView === "upcoming") {
    return resultFilter === "all"
      ? "You have no upcoming match predictions yet. Go to the matches page and add predictions before kickoff."
      : "No upcoming predictions match this result filter.";
  }

  if (activeView === "live") {
    return "You have no predictions for matches currently live.";
  }

  if (activeView === "finished") {
    return "No finished match predictions match this filter yet.";
  }

  return "Visit the matches page and lock in your first call before kickoff.";
}

export function MyPredictionsPage() {
  const {
    championPrediction: contextChampionPrediction,
    refreshChampionPrediction,
    user,
    profile,
  } = useAuth();

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [championPick, setChampionPick] = useState(
    contextChampionPrediction ?? null,
  );
  const [activeView, setActiveView] = useState("upcoming");
  const [resultFilter, setResultFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const [matchRows, predictionRows, championRow] = await Promise.all([
          matchService.getMatches(),
          predictionService.getPredictionsForUser(user.id),
          championService.getMyPrediction(user.id),
        ]);

        setMatches(matchRows);
        setPredictions(predictionRows);
        setChampionPick(championRow ?? contextChampionPrediction ?? null);

        if (championRow && !contextChampionPrediction) {
          refreshChampionPrediction?.();
        }
      } catch (error) {
        toast.error(
          getSafeErrorMessage(error, "Could not load your predictions."),
        );

        setChampionPick(contextChampionPrediction ?? null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [contextChampionPrediction, refreshChampionPrediction, user.id]);

  const allRows = useMemo(() => {
    const matchById = new Map(matches.map((match) => [match.id, match]));

    return predictions
      .map((prediction) => ({
        prediction,
        match: matchById.get(prediction.match_id),
      }))
      .filter(({ match }) => Boolean(match))
      .sort(
        (a, b) => new Date(a.match.match_date) - new Date(b.match.match_date),
      );
  }, [matches, predictions]);

  const rows = useMemo(() => {
    return allRows
      .filter(({ match }) => {
        const status = normalizeStatus(match.status);

        if (activeView === "upcoming") return status === "upcoming";
        if (activeView === "live") return liveStatuses.has(status);
        if (activeView === "finished") return status === "finished";

        return true;
      })
      .filter(({ prediction }) => {
        if (resultFilter === "correct") return prediction.is_correct === true;
        if (resultFilter === "wrong") return prediction.is_correct === false;
        if (resultFilter === "pending") return prediction.is_correct === null;

        return true;
      });
  }, [activeView, allRows, resultFilter]);

  const isTournamentDecided = useMemo(
    () =>
      matches.some(
        (match) =>
          isFinalStage(match.stage) &&
          normalizeStatus(match.status) === "finished",
      ),
    [matches],
  );

  const summary = useMemo(() => {
    const upcoming = allRows.filter(
      ({ match }) => normalizeStatus(match.status) === "upcoming",
    ).length;

    const live = allRows.filter(({ match }) =>
      liveStatuses.has(normalizeStatus(match.status)),
    ).length;

    const finished = allRows.filter(
      ({ match }) => normalizeStatus(match.status) === "finished",
    ).length;

    const matchPoints = predictions.reduce(
      (sum, prediction) => sum + getPredictionTotalPoints(prediction),
      0,
    );

    // Same source as the dashboard so both pages report one total,
    // including champion and bracket points.
    const totalPoints = profile?.total_points ?? profile?.points ?? matchPoints;

    const correct = predictions.filter(
      (prediction) => prediction.is_correct === true,
    ).length;

    const exact = predictions.filter(
      (prediction) => Number(prediction.exact_score_points ?? 0) > 0,
    ).length;

    return {
      upcoming,
      live,
      finished,
      total: allRows.length,
      totalPoints,
      correct,
      exact,
    };
  }, [allRows, predictions, profile]);

  if (loading) {
    return <LoadingSpinner label="Loading your predictions" />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Your calls
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            My Predictions
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Review upcoming picks, live matches, finished results, champion
            selection, and bracket progress from one place.
          </p>
        </div>

        <Link
          to="/matches"
          className="inline-flex justify-center rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
        >
          Add predictions
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total points" value={summary.totalPoints} />
        <SummaryCard label="Correct picks" value={summary.correct} />
        <SummaryCard label="Exact scores" value={summary.exact} />
        <SummaryCard label="Total predictions" value={summary.total} />
      </section>

      {championPick ? (
        <section className="mt-8 rounded-lg border border-gold-300/30 bg-gold-300/10 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-300">
                World Cup winner pick
              </p>

              <h2 className="mt-3 text-3xl font-black text-white">
                {championPick.predicted_team}
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                This pick is locked for the tournament and cannot be changed.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <ChampionMetric label="Potential points" value="3 pts" />
              <ChampionMetric
                label="Result"
                value={getChampionResultLabel(championPick, isTournamentDecided)}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-lg border border-gold-300/30 bg-gold-300/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-300">
            World Cup winner pick
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-200">
                You have not selected a champion yet.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Champion prediction is worth 3 points.
              </p>
            </div>

            <Link
              to="/champion-pick"
              className="inline-flex justify-center rounded-full bg-gold-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-white"
            >
              Pick champion
            </Link>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
          Bracket predictions
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-200">
            Pick which teams advance before each knockout stage locks. These
            picks are scored separately.
          </p>

          <Link
            to="/bracket"
            className="inline-flex justify-center rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-white"
          >
            Open bracket
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-white/10 bg-slate-950/72 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {viewTabs.map((tab) => {
              const count =
                tab.value === "upcoming"
                  ? summary.upcoming
                  : tab.value === "live"
                    ? summary.live
                    : tab.value === "finished"
                      ? summary.finished
                      : summary.total;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveView(tab.value)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeView === tab.value
                      ? "bg-emerald-300 text-emerald-950"
                      : "bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {tab.label}{" "}
                  <span className="ml-1 opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {resultFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setResultFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  resultFilter === filter.value
                    ? "bg-gold-300 text-slate-950"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {rows.length ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-slate-950/72">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-5 py-4">Match</th>
                  <th className="px-5 py-4">Prediction</th>
                  <th className="px-5 py-4">Score Pick</th>
                  <th className="px-5 py-4">Actual</th>
                  <th className="px-5 py-4">Winner</th>
                  <th className="px-5 py-4">Exact</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Editable</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {rows.map(({ match, prediction }) => (
                  <tr key={prediction.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-bold text-white">
                      {match.team_a} vs {match.team_b}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {getPredictionLabel(match, prediction.predicted_result)}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {getPredictedScoreLabel(prediction)}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {match.result
                        ? `${getPredictionLabel(match, match.result)} (${
                            match.team_a_score ?? "-"
                          }-${match.team_b_score ?? "-"})`
                        : "Pending"}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {Number(prediction.winner_points ?? 0)}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {prediction.exact_score_points ?? 0}
                    </td>

                    <td className="px-5 py-4 font-black text-gold-300">
                      {getPredictionTotalPoints(prediction)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        label={getPredictionStatus(match, prediction)}
                      />
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {formatDateTime(match.match_date)}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {!isMatchLocked(match) &&
                      normalizeStatus(match.status) === "upcoming"
                        ? "Yes"
                        : "Locked"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No predictions found"
            description={getEmptyDescription(activeView, resultFilter)}
          />
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </article>
  );
}

function ChampionMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/60 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-gold-300">{value}</p>
    </div>
  );
}