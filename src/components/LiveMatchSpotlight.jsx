import { ChevronRight, Lock, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { TeamFlag } from "./TeamFlag";
import { TeamLink } from "./team/TeamLink.jsx";
import {
  getLiveGoalEvents,
  getLivePhaseClassName,
  getLivePhaseLabel,
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
} from "../utils/matchDisplay";
import { getPredictionSummary } from "../utils/predictions";

const liveStatusHeadings = {
  live: "LIVE",
  halftime: "HALF TIME",
  extra_time: "EXTRA TIME",
  penalties: "PENALTIES",
  penalty_shootout: "PENALTIES",
};

function getLiveStatusHeading(match) {
  const status = normalizeMatchDisplayStatus(match?.status);
  return liveStatusHeadings[status] ?? "LIVE";
}

function getScoreDisplay(match) {
  return `${match?.team_a_score ?? "-"} - ${match?.team_b_score ?? "-"}`;
}

export function LiveMatchSpotlight({ match, prediction }) {
  const liveStatusHeading = getLiveStatusHeading(match);
  const livePhaseLabel = getLivePhaseLabel(match);
  const livePhaseClassName = getLivePhaseClassName(match);
  const liveGoalEvents = getLiveGoalEvents(match);
  const predictionSummary = prediction
    ? getPredictionSummary(match, prediction)
    : null;
  const isLive = isMatchInLivePhase(match);

  return (
    <article
      className="min-w-0 overflow-hidden rounded-xl border border-emerald-300/55 bg-slate-950/80 p-4 shadow-[0_0_32px_rgba(52,211,153,0.18)] sm:p-5"
      aria-live={isLive ? "polite" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LiveStatusBadge label={liveStatusHeading} />

        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          <Trophy size={13} className="shrink-0 text-gold-300" />
          <span className="min-w-0 break-words">{match.stage}</span>
        </p>
      </div>

      <div className="mt-3 min-w-0 space-y-2 sm:mt-4 sm:hidden">
        <div className="grid grid-cols-2 gap-3">
          <SpotlightTeam name={match.team_a} align="left" />
          <SpotlightTeam name={match.team_b} align="right" />
        </div>

        <SpotlightScore
          score={getScoreDisplay(match)}
          phaseLabel={livePhaseLabel}
          phaseClassName={livePhaseClassName}
        />
      </div>

      <div className="mt-3 hidden min-w-0 sm:mt-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-4">
        <SpotlightTeam name={match.team_a} align="left" />
        <SpotlightScore
          score={getScoreDisplay(match)}
          phaseLabel={livePhaseLabel}
          phaseClassName={livePhaseClassName}
        />
        <SpotlightTeam name={match.team_b} align="right" />
      </div>

      {liveGoalEvents.length ? (
        <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-white/10 pt-3 text-xs text-slate-300 sm:gap-x-4">
          <GoalEventList
            events={liveGoalEvents.filter((event) => event.side === "team_a")}
            teamLabel={match.team_a}
          />
          <GoalEventList
            align="right"
            events={liveGoalEvents.filter((event) => event.side === "team_b")}
            teamLabel={match.team_b}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-3 sm:mt-4">
        {predictionSummary ? (
          <p className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-slate-200">
            <Lock size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
            <span className="min-w-0 break-words">
              Your pick: {predictionSummary}
            </span>
          </p>
        ) : (
          <p className="text-sm font-semibold text-slate-400">No prediction saved</p>
        )}

        <Link
          to={`/matches?match=${match.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full border border-emerald-300/45 px-4 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 sm:w-auto sm:self-start"
        >
          View match <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function LiveStatusBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/35 bg-emerald-200/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100">
      <span
        className="h-2 w-2 rounded-full bg-emerald-200 motion-safe:animate-pulse motion-reduce:animate-none"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function SpotlightTeam({ name, align = "left" }) {
  const isRightAligned = align === "right";

  return (
    <div className={`min-w-0 ${isRightAligned ? "sm:text-right" : ""}`}>
      <TeamLink
        team={name}
        className={`flex min-w-0 items-center gap-2 ${
          isRightAligned ? "sm:justify-end sm:ml-auto" : ""
        }`}
      >
        {isRightAligned ? null : <TeamFlag size="md" teamName={name} />}

        <span className="min-w-0 break-words text-base font-black leading-snug text-white sm:text-lg">
          {name}
        </span>

        {isRightAligned ? <TeamFlag size="md" teamName={name} /> : null}
      </TeamLink>
    </div>
  );
}

function SpotlightScore({ score, phaseLabel, phaseClassName }) {
  return (
    <div className="min-w-0 text-center">
      <p className="whitespace-nowrap text-3xl font-black tracking-tight text-white sm:text-4xl">
        {score}
      </p>

      {phaseLabel ? (
        <p className={`mt-1 text-sm font-bold ${phaseClassName}`}>{phaseLabel}</p>
      ) : null}
    </div>
  );
}

function GoalEventList({ events, align = "left", teamLabel }) {
  const isRightAligned = align === "right";

  if (!events.length) {
    return <div className="min-w-0" aria-hidden="true" />;
  }

  return (
    <ul
      className={`min-w-0 space-y-1 ${isRightAligned ? "text-right" : "text-left"}`}
      aria-label={teamLabel ? `${teamLabel} scorers` : undefined}
    >
      {events.map((event, index) => (
        <li key={index} className="min-w-0 break-words font-semibold leading-5">
          {event.minute ? (
            <span className="text-emerald-200">{event.minute} </span>
          ) : null}
          {event.player ?? "Goal"}
          {event.ownGoal ? <span className="text-slate-400"> (o.g.)</span> : null}
          {event.penalty ? <span className="text-slate-400"> (pen.)</span> : null}
        </li>
      ))}
    </ul>
  );
}
