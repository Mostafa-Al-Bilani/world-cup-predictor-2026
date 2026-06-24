import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { TeamFlag } from "../components/TeamFlag.jsx";
import { TeamMatchCard } from "../components/team/TeamMatchCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { teamService } from "../services/teamService.js";
import { formatDateTime } from "../utils/date.js";
import { getSafeErrorMessage } from "../utils/errors.js";
import {
  getLivePhaseLabel,
} from "../utils/matchDisplay.js";
import { getOpponentInMatch } from "../utils/teamIdentity.js";
import {
  filterTeamMatches,
  getTeamTournamentStatus,
  TEAM_MATCH_FILTERS,
} from "../utils/teamMatchOrdering.js";

const MATCH_FILTERS = [
  { value: TEAM_MATCH_FILTERS.ALL, label: "All" },
  { value: TEAM_MATCH_FILTERS.LIVE, label: "Live" },
  { value: TEAM_MATCH_FILTERS.UPCOMING, label: "Upcoming" },
  { value: TEAM_MATCH_FILTERS.FINISHED, label: "Finished" },
];

function getFeaturedMatch(matches, team, now) {
  const liveMatches = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.LIVE,
    now,
  });

  if (liveMatches.length) {
    return { kind: "live", match: liveMatches[0] };
  }

  const upcomingMatches = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.UPCOMING,
    now,
  });

  if (upcomingMatches.length) {
    return { kind: "upcoming", match: upcomingMatches[0] };
  }

  return null;
}

function StatCard({ label, value, secondary }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {secondary ? (
        <p className="mt-1 text-xs text-slate-400">{secondary}</p>
      ) : null}
    </div>
  );
}

function ImpactRow({ label, value, pending }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="text-right text-sm font-black text-white">
        {pending ? "Result calculation pending" : value}
      </span>
    </div>
  );
}

export function TeamDetailPage() {
  const { teamSlug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matchFilter, setMatchFilter] = useState(TEAM_MATCH_FILTERS.ALL);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await teamService.getTeamPageData({
          teamSlug,
          userId: user?.id,
        });

        if (cancelled) return;

        setPageData(data);
      } catch (loadError) {
        if (!cancelled) {
          setPageData(null);
          setError(getSafeErrorMessage(loadError, "Could not load team."));
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
  }, [teamSlug, user?.id]);

  const filteredMatches = useMemo(() => {
    if (!pageData) return [];

    return filterTeamMatches({
      matches: pageData.matches,
      team: pageData.team.name,
      filter: matchFilter,
      now,
    });
  }, [pageData, matchFilter, now]);

  const featuredMatch = useMemo(() => {
    if (!pageData) return null;

    return getFeaturedMatch(pageData.matches, pageData.team.name, now);
  }, [pageData, now]);

  const tournamentStatus = useMemo(() => {
    if (!pageData) return null;

    return getTeamTournamentStatus({
      matches: pageData.matches,
      team: pageData.team.name,
      now,
    });
  }, [pageData, now]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
        <LoadingSpinner label="Loading team..." />
      </main>
    );
  }

  if (!pageData) {
    return (
      <main className="mx-auto grid min-h-[68vh] max-w-3xl place-items-center px-4 py-16 text-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Team not found
          </p>
          <h1 className="mt-4 text-4xl font-black text-white">
            That team is not in the tournament board.
          </h1>
          <p className="mt-4 text-slate-300">
            {error || "Check the team name or browse the full teams directory."}
          </p>
          <Link
            to="/teams"
            className="mt-8 inline-flex rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
          >
            Browse teams
          </Link>
        </div>
      </main>
    );
  }

  const { team, tournamentStats, predictionImpact, goalStats, predictionsByMatchId } =
    pageData;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/72 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <TeamFlag teamName={team.name} size="xl" variant="premium" />
            <h1 className="mt-4 break-words text-3xl font-black text-white sm:text-4xl">
              {team.name}
            </h1>
            <p className="mt-2 text-sm font-bold text-emerald-200">
              {team.group ?? "Tournament team"}
              {tournamentStatus ? ` · ${tournamentStatus}` : ""}
            </p>
            <p className="mt-4 text-sm text-slate-300">
              Played {tournamentStats.played} · Won {tournamentStats.wins} ·
              Drawn {tournamentStats.draws} · Lost {tournamentStats.losses}
            </p>
          </div>

          {featuredMatch ? (
            <div className="min-w-0 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5 lg:max-w-md">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                {featuredMatch.kind === "live" ? "Live now" : "Next match"}
              </p>
              <Link
                to={`/matches?match=${featuredMatch.match.id}`}
                className="mt-3 block rounded-lg transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                <p className="break-words text-lg font-black text-white">
                  {team.name} vs {getOpponentInMatch(featuredMatch.match, team.name)}
                </p>
                {featuredMatch.kind === "live" ? (
                  <p className="mt-2 text-sm font-bold text-emerald-100">
                    {featuredMatch.match.team_a_score ?? "-"}–
                    {featuredMatch.match.team_b_score ?? "-"}
                    {getLivePhaseLabel(featuredMatch.match)
                      ? ` · ${getLivePhaseLabel(featuredMatch.match)}`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(featuredMatch.match.match_date)}
                  </p>
                )}
                {(featuredMatch.match.venue || featuredMatch.match.city) && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                    <MapPin size={14} />
                    {[featuredMatch.match.venue, featuredMatch.match.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-black text-white">Tournament statistics</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
          <StatCard label="Matches played" value={tournamentStats.played} />
          <StatCard label="Wins" value={tournamentStats.wins} />
          <StatCard label="Draws" value={tournamentStats.draws} />
          <StatCard label="Losses" value={tournamentStats.losses} />
          <StatCard label="Goals for" value={tournamentStats.goalsFor} />
          <StatCard label="Goals against" value={tournamentStats.goalsAgainst} />
          <StatCard
            label="Goal difference"
            value={
              tournamentStats.goalDifference > 0
                ? `+${tournamentStats.goalDifference}`
                : tournamentStats.goalDifference
            }
          />
          <StatCard label="Clean sheets" value={tournamentStats.cleanSheets} />
        </div>

        <div className="mt-3 grid gap-3 min-[768px]:grid-cols-3">
          {tournamentStats.averageGoalsPerMatch ? (
            <StatCard
              label="Average goals per match"
              value={tournamentStats.averageGoalsPerMatch}
            />
          ) : null}
          {tournamentStats.currentForm.length ? (
            <StatCard
              label="Current form"
              value={tournamentStats.currentForm.join(" · ")}
            />
          ) : null}
          {tournamentStats.biggestWin ? (
            <StatCard
              label="Biggest win"
              value={`${tournamentStats.biggestWin.teamScore}–${tournamentStats.biggestWin.opponentScore} vs ${tournamentStats.biggestWin.opponent}`}
            />
          ) : null}
        </div>
      </section>

      <section className="mt-8 grid gap-6 min-[1024px]:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/72 p-5">
          <h2 className="text-lg font-black text-white">Your prediction impact</h2>

          {isAuthenticated ? (
            <>
              {predictionImpact.hasPendingScoring ? (
                <p className="mt-2 text-xs text-amber-100">
                  Some finished matches are still waiting for official scoring.
                </p>
              ) : null}

              <div className="mt-4">
                <ImpactRow
                  label="Points earned"
                  value={predictionImpact.pointsEarned}
                  pending={false}
                />
                <ImpactRow
                  label="Potential points missed"
                  value={predictionImpact.potentialPointsMissed}
                />
                <ImpactRow
                  label="Unclaimed from missing predictions"
                  value={predictionImpact.unclaimedPoints}
                />
                <ImpactRow
                  label="Correct results"
                  value={predictionImpact.correctResults}
                />
                <ImpactRow
                  label="Exact scores"
                  value={predictionImpact.exactScores}
                />
                <ImpactRow
                  label="Incorrect predictions"
                  value={predictionImpact.incorrectPredictions}
                />
                <ImpactRow
                  label="Matches not predicted"
                  value={predictionImpact.matchesNotPredicted}
                />
                <ImpactRow
                  label="Prediction accuracy"
                  value={`${predictionImpact.predictionAccuracy}%`}
                />
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-300">
              Sign in to view your predictions and points for this team.
            </p>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-slate-950/72 p-5">
          <h2 className="text-lg font-black text-white">Goal breakdown</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Goals scored</span>
              <span className="font-black text-white">{goalStats.goalsScored}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Goals conceded</span>
              <span className="font-black text-white">{goalStats.goalsConceded}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Open-play goals</span>
              <span className="font-black text-white">{goalStats.openPlayGoals}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Penalty goals</span>
              <span className="font-black text-white">{goalStats.penaltyGoals}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Own-goal benefits</span>
              <span className="font-black text-white">{goalStats.ownGoalBenefits}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-300">Own goals committed</span>
              <span className="font-black text-white">{goalStats.ownGoalsCommitted}</span>
            </div>
          </div>

          {goalStats.hasIncompleteEventData ? (
            <p className="mt-4 text-xs text-slate-400">
              Detailed scorer data is available for {goalStats.detailedGoalsAvailable}{" "}
              of {goalStats.goalsScored} goals.
            </p>
          ) : null}

          {goalStats.topScorers.length ? (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Top scorers
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                {goalStats.topScorers.map((scorer, index) => (
                  <li
                    key={scorer.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-slate-300">
                      {index + 1}. {scorer.name}
                    </span>
                    <span className="font-black text-white">{scorer.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {goalStats.ownGoalBenefits > 0 ? (
            <p className="mt-3 text-xs text-slate-400">
              Own-goal benefit {goalStats.ownGoalBenefits}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">Team matches</h2>
          <div className="flex flex-wrap gap-2">
            {MATCH_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMatchFilter(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  matchFilter === option.value
                    ? "bg-emerald-300 text-emerald-950"
                    : "border border-white/10 text-slate-200 hover:border-emerald-300/40"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!filteredMatches.length ? (
          <div className="mt-6">
            <EmptyState
              title="No matches in this filter"
              description="Try another filter or check back when fixtures are assigned."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {filteredMatches.map((match) => (
              <TeamMatchCard
                key={match.id}
                match={match}
                team={team.name}
                prediction={predictionsByMatchId[match.id] ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
