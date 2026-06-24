import { ChevronRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { CompactScorerGroup } from "../CompactMatchScorers.jsx";
import { StatusBadge } from "../StatusBadge.jsx";
import { TeamFlag } from "../TeamFlag.jsx";
import { TeamLink } from "./TeamLink.jsx";
import { formatDateTime } from "../../utils/date.js";
import { getCompletedMatchScorerState } from "../../utils/matchGoalEvents.js";
import {
  getLivePhaseLabel,
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
} from "../../utils/matchDisplay.js";
import { getCompletedPredictionOutcome } from "../../utils/predictions.js";
import {
  getOpponentInMatch,
  getTeamSideInMatch,
} from "../../utils/teamIdentity.js";

const statusLabels = {
  upcoming: "Upcoming",
  live: "Live",
  halftime: "Half time",
  extra_time: "Extra time",
  penalties: "Penalties",
  penalty_shootout: "Penalty shootout",
  finished: "Full time",
};

function getStatusLabel(match) {
  const normalizedStatus = normalizeMatchDisplayStatus(match?.status);

  if (normalizedStatus === "finished") {
    return statusLabels.finished;
  }

  return statusLabels[normalizedStatus] ?? "Match";
}

export function TeamMatchCard({ match, team, prediction }) {
  const side = getTeamSideInMatch(match, team);
  const opponent = getOpponentInMatch(match, team);
  const normalizedStatus = normalizeMatchDisplayStatus(match?.status);
  const isLive = isMatchInLivePhase(match);
  const isFinished = normalizedStatus === "finished";
  const isUpcoming = normalizedStatus === "upcoming" && !isLive;
  const teamScore = side ? (match[`${side}_score`] ?? "-") : "-";
  const opponentScore = side
    ? (match[side === "team_a" ? "team_b_score" : "team_a_score"] ?? "-")
    : "-";
  const outcome = getCompletedPredictionOutcome(match, prediction ?? null);
  const scorerState = getCompletedMatchScorerState(match);
  const livePhaseLabel = getLivePhaseLabel(match);

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 shadow-xl">
      <div className="border-b border-white/10 bg-white/[0.03] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusBadge label={getStatusLabel(match)} />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {match.stage ?? "Match"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0 text-left">
            <TeamLink
              team={team}
              className="inline-flex min-w-0 items-center gap-2 font-black text-white"
            >
              <TeamFlag teamName={team} size="md" />
              <span className="truncate">{team}</span>
            </TeamLink>
          </div>

          <div className="text-center text-2xl font-black text-white">
            {isUpcoming ? (
              <span className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
                VS
              </span>
            ) : (
              <>
                {teamScore}
                <span className="mx-2 text-slate-500">–</span>
                {opponentScore}
                {isLive && livePhaseLabel ? (
                  <span className="ml-2 align-middle text-xs font-bold text-emerald-200">
                    {livePhaseLabel}
                  </span>
                ) : null}
              </>
            )}
          </div>

          <div className="min-w-0 text-right">
            <TeamLink
              team={opponent}
              className="inline-flex min-w-0 items-center justify-end gap-2 font-black text-white"
            >
              <span className="truncate">{opponent}</span>
              <TeamFlag teamName={opponent} size="md" />
            </TeamLink>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <span>{formatDateTime(match.match_date)}</span>
          {match.venue || match.city ? (
            <span className="inline-flex items-center gap-2 sm:justify-end">
              <MapPin size={14} className="text-sky-300" />
              {[match.venue, match.city].filter(Boolean).join(", ")}
            </span>
          ) : null}
        </div>

        {isFinished && scorerState?.kind === "scorers" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompactScorerGroup
              label={match.team_a}
              events={scorerState.teamA}
              align="left"
            />
            <CompactScorerGroup
              label={match.team_b}
              events={scorerState.teamB}
              align="right"
            />
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm">
          {outcome.kind === "none" ? (
            <>
              <p className="font-bold text-slate-300">No prediction submitted</p>
              {isFinished ? (
                <p className="mt-1 text-amber-100">Potential points unclaimed</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-bold text-white">
                Your pick: {outcome.pickSummary}
              </p>
              {outcome.outcomeLabel ? (
                <p
                  className={`mt-1 ${
                    outcome.tone === "exact" || outcome.tone === "success"
                      ? "text-emerald-200"
                      : outcome.tone === "incorrect"
                        ? "text-rose-200"
                        : "text-slate-300"
                  }`}
                >
                  {outcome.outcomeLabel}
                  {outcome.pointsLabel ? ` · ${outcome.pointsLabel}` : ""}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4">
          <Link
            to={`/matches?match=${match.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950"
          >
            {isUpcoming ? "View prediction" : "View match"}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
