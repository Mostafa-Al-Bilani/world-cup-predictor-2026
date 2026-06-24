import {
  CalendarDays,
  ChevronRight,
  Clock,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { CompactNoGoalsLabel, CompactScorerGroup } from "./CompactMatchScorers";
import { LiveMatchSpotlight } from "./LiveMatchSpotlight";
import { StatusBadge } from "./StatusBadge";
import { TeamFlag } from "./TeamFlag";
import { TeamLink } from "./team/TeamLink.jsx";
import { formatDateTime, getUserTimeZone } from "../utils/date";
import { formatKickoffCountdown } from "../utils/kickoffCountdown";
import {
  MATCH_CENTER_LAST_24H_PANEL_CLASS,
  MATCH_CENTER_NEXT_24H_PANEL_CLASS,
  MATCH_CENTER_PANELS_GRID_CLASS,
  UPCOMING_SIDEBAR_ACTION_CLASS,
  UPCOMING_SIDEBAR_CARD_CLASS,
  UPCOMING_SIDEBAR_HEADER_CLASS,
  UPCOMING_SIDEBAR_METADATA_CLASS,
  UPCOMING_SIDEBAR_TEAM_ROW_CLASS,
  UPCOMING_SIDEBAR_VS_CLASS,
} from "../utils/matchCenterLayout";
import { normalizeMatchDisplayStatus } from "../utils/matchDisplay";
import { getCompletedMatchScorerState } from "../utils/matchGoalEvents";
import {
  getCompletedPredictionOutcome,
  getPredictionSummary,
} from "../utils/predictions";

const statusLabels = {
  upcoming: "Upcoming",
  live: "Live",
  halftime: "Half time",
  extra_time: "Extra time",
  penalties: "Penalties",
  penalty_shootout: "Penalty shootout",
  finished: "Full time",
};

const readText = (value) => String(value ?? "").trim();

function getStatusLabel(match) {
  const normalizedStatus = normalizeMatchDisplayStatus(match?.status);

  if (normalizedStatus === "finished") {
    const detail = readText(match?.status_detail);
    if (detail.toUpperCase() === "FT") return "Full time";
    return detail || "Full time";
  }

  return statusLabels[normalizedStatus] ?? (readText(match?.status) || "Match");
}

function getFinalScore(match) {
  return `${match?.team_a_score ?? "-"} - ${match?.team_b_score ?? "-"}`;
}

export function DashboardMatchCenter({
  liveMatches,
  recentMatches,
  nextMatches,
  predictionByMatch,
  now,
}) {
  const timeZone = getUserTimeZone();
  const hasLiveMatches = liveMatches.length > 0;
  const firstUpcomingMatchId = nextMatches[0]?.id;

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-slate-950/72 p-4 shadow-2xl sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-black text-white">
            24-hour match center
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Recent results, live scores, and the next fixtures in your local
            time.
          </p>

          <p className="mt-3 inline-flex max-w-full rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
            Times shown in {timeZone}
          </p>
        </div>

        <Link
          to="/matches"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-glow transition hover:bg-white sm:w-auto"
        >
          Full schedule <ChevronRight size={18} />
        </Link>
      </div>

      {hasLiveMatches ? (
        <LiveMatchesArea
          liveMatches={liveMatches}
          predictionByMatch={predictionByMatch}
        />
      ) : null}

      <div
        className={`${MATCH_CENTER_PANELS_GRID_CLASS} ${
          hasLiveMatches ? "mt-5 sm:mt-6" : "mt-6"
        }`}
      >
        <MatchWindowPanel
          title="Last 24 hours"
          description="Completed matches from the previous day."
          className={MATCH_CENTER_LAST_24H_PANEL_CLASS}
        >
          {recentMatches.length ? (
            recentMatches.map((match) => (
              <RecentCompletedCard
                key={match.id}
                match={match}
                prediction={predictionByMatch.get(match.id)}
              />
            ))
          ) : (
            <CompactEmptyState
              title="No results from the last 24 hours"
              description="Completed matches will appear here automatically."
            />
          )}
        </MatchWindowPanel>

        <MatchWindowPanel
          title="Next 24 hours"
          description="Upcoming fixtures that are still open for predictions."
          className={MATCH_CENTER_NEXT_24H_PANEL_CLASS}
        >
          {nextMatches.length ? (
            nextMatches.map((match) => (
              <UpcomingCompactCard
                key={match.id}
                match={match}
                prediction={predictionByMatch.get(match.id)}
                showCountdown={match.id === firstUpcomingMatchId}
                now={now}
              />
            ))
          ) : (
            <CompactEmptyState
              title="No matches in the next 24 hours"
              description="Check the full schedule for later fixtures."
              actionLabel="Open schedule"
            />
          )}
        </MatchWindowPanel>
      </div>
    </section>
  );
}

function LiveMatchesArea({ liveMatches, predictionByMatch }) {
  const hasMultipleLiveMatches = liveMatches.length > 1;

  return (
    <div className="mt-4 flex justify-center sm:mt-5">
      <div
        className={
          hasMultipleLiveMatches
            ? "grid w-full max-w-6xl gap-4 lg:grid-cols-2 lg:gap-5"
            : "w-full max-w-3xl xl:max-w-4xl"
        }
      >
        {liveMatches.map((match) => (
          <LiveMatchSpotlight
            key={match.id}
            match={match}
            prediction={predictionByMatch.get(match.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchWindowPanel({ title, description, className, children }) {
  return (
    <section className={`min-w-0 rounded-lg bg-white/[0.03] p-4 ${className}`}>
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>

      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function RecentCompletedCard({ match, prediction }) {
  const scorerState = getCompletedMatchScorerState(match);
  const outcome = getCompletedPredictionOutcome(match, prediction);

  return (
    <CompactMatchCard
      match={match}
      statusLabel={getStatusLabel(match)}
      statusTone="finished"
      scoreBlock={
        <CompactFinishedScoreBlock match={match} scorerState={scorerState} />
      }
      predictionOutcome={outcome}
      detail={
        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-300">
          <Clock size={15} className="shrink-0 text-emerald-300" />
          {formatDateTime(match.match_date)}
        </span>
      }
      actionLabel="View match"
    />
  );
}

function CompactFinishedScoreBlock({ match, scorerState }) {
  const score = getFinalScore(match);

  return (
    <>
      <div className="hidden min-w-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-x-3 sm:gap-y-1">
        <CompactTeamName name={match.team_a} />
        <p className="self-center whitespace-nowrap text-xl font-black text-white">
          {score}
        </p>
        <CompactTeamName name={match.team_b} align="right" />

        {scorerState?.kind === "scorers" ? (
          <>
            <CompactScorerGroup events={scorerState.teamA} align="left" />
            <span aria-hidden="true" />
            <CompactScorerGroup events={scorerState.teamB} align="right" />
          </>
        ) : null}

        {scorerState?.kind === "no_goals" ? (
          <CompactNoGoalsLabel className="col-span-3 mt-0.5" />
        ) : null}
      </div>

      <div className="min-w-0 sm:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
          <div className="min-w-0">
            <CompactTeamName name={match.team_a} />
            {scorerState?.kind === "scorers" ? (
              <CompactScorerGroup
                events={scorerState.teamA}
                align="left"
                className="mt-0.5"
              />
            ) : null}
          </div>

          <p className="self-center whitespace-nowrap px-1 text-xl font-black text-white">
            {score}
          </p>

          <div className="min-w-0">
            <CompactTeamName name={match.team_b} align="right" />
            {scorerState?.kind === "scorers" ? (
              <CompactScorerGroup
                events={scorerState.teamB}
                align="right"
                className="mt-0.5"
              />
            ) : null}
          </div>
        </div>

        {scorerState?.kind === "no_goals" ? (
          <CompactNoGoalsLabel className="mt-1" />
        ) : null}
      </div>
    </>
  );
}

function UpcomingCompactCard({ match, prediction, showCountdown, now }) {
  const countdown = showCountdown
    ? formatKickoffCountdown(match.match_date, now)
    : null;
  const predictionSummary = prediction
    ? getPredictionSummary(match, prediction)
    : null;

  return (
    <article className={UPCOMING_SIDEBAR_CARD_CLASS}>
      <div className={UPCOMING_SIDEBAR_HEADER_CLASS}>
        <p className="inline-flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          <Trophy size={14} className="shrink-0 text-gold-300" />
          <span className="min-w-0 break-words">{match.stage}</span>
        </p>

        <StatusBadge label={getStatusLabel(match)} />
      </div>

      {countdown ? (
        <div className="mt-1.5">
          <KickoffCountdownPill countdown={countdown} />
        </div>
      ) : null}

      <div className={UPCOMING_SIDEBAR_TEAM_ROW_CLASS}>
        <CompactTeamName name={match.team_a} showTitle />
        <span className={UPCOMING_SIDEBAR_VS_CLASS}>VS</span>
        <CompactTeamName name={match.team_b} align="right" showTitle />
      </div>

      <div className={UPCOMING_SIDEBAR_METADATA_CLASS}>
        <p className="inline-flex min-w-0 items-center gap-2 text-sm text-slate-300">
          <CalendarDays size={15} className="shrink-0 text-emerald-300" />
          <span className="min-w-0 break-words">
            {formatDateTime(match.match_date)}
          </span>
        </p>

        <p className="min-w-0 break-words text-sm font-semibold text-slate-200">
          {predictionSummary
            ? `Your pick: ${predictionSummary}`
            : "No prediction yet"}
        </p>
      </div>

      <Link
        to={`/matches?match=${match.id}`}
        className={UPCOMING_SIDEBAR_ACTION_CLASS}
      >
        {prediction ? "View prediction" : "Predict"} <ChevronRight size={16} />
      </Link>
    </article>
  );
}

function CompactMatchCard({
  match,
  statusLabel,
  statusTone = "neutral",
  centerContent,
  scoreBlock,
  predictionOutcome,
  detail,
  note,
  actionLabel,
  countdown,
}) {
  return (
    <article className="min-w-0 rounded-lg border border-white/10 bg-slate-950/55 p-3.5 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="inline-flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          <Trophy size={14} className="shrink-0 text-gold-300" />
          <span className="min-w-0 break-words">{match.stage}</span>
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          {countdown ? (
            <KickoffCountdownPill
              countdown={countdown}
              className="hidden sm:inline-flex"
            />
          ) : null}

          <StatusBadge label={statusLabel} tone={statusTone} />
        </div>
      </div>

      {scoreBlock ? (
        <div className="mt-3 min-w-0">{scoreBlock}</div>
      ) : (
        <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <CompactTeamName name={match.team_a} />
          {centerContent}
          <CompactTeamName name={match.team_b} align="right" />
        </div>
      )}

      {predictionOutcome ? (
        <CompletedPredictionSummary outcome={predictionOutcome} />
      ) : null}

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="min-w-0 break-words">{detail}</p>

          {countdown ? (
            <KickoffCountdownPill
              countdown={countdown}
              className="sm:hidden"
            />
          ) : null}

          {note ? (
            <p className="min-w-0 break-words text-sm font-semibold text-slate-200">
              {note}
            </p>
          ) : null}
        </div>

        <Link
          to={`/matches?match=${match.id}`}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-1 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-300/40 hover:text-emerald-100 sm:w-auto"
        >
          {actionLabel} <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function CompletedPredictionSummary({ outcome }) {
  const toneClassName = {
    exact: "text-gold-200",
    success: "text-emerald-200",
    incorrect: "text-rose-200/90",
    muted: "text-slate-400",
  }[outcome.tone ?? "muted"];

  return (
    <div className="mt-3 min-w-0 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
      {outcome.pickSummary ? (
        <p className="min-w-0 break-words text-sm text-slate-200">
          <span className="font-semibold text-slate-400">Your pick:</span>{" "}
          {outcome.pickSummary}
        </p>
      ) : (
        <p className="text-sm font-semibold text-slate-400">
          {outcome.outcomeLabel}
        </p>
      )}

      {outcome.pickSummary ? (
        <p
          className={`mt-1 min-w-0 break-words text-sm font-semibold ${toneClassName}`}
        >
          {outcome.pointsLabel
            ? `${outcome.outcomeLabel} · ${outcome.pointsLabel}`
            : outcome.outcomeLabel}
        </p>
      ) : null}
    </div>
  );
}

function KickoffCountdownPill({ countdown, className = "" }) {
  const isStartingNow = countdown.expired;

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isStartingNow
          ? "border-white/15 bg-white/[0.05] text-slate-300"
          : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      } ${className}`}
      aria-label={countdown.ariaLabel}
    >
      <Clock
        size={12}
        className={`shrink-0 ${isStartingNow ? "text-slate-400" : "text-emerald-300"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 break-words">{countdown.text}</span>
    </span>
  );
}

function CompactTeamName({ name, align = "left", showTitle = false }) {
  const isRightAligned = align === "right";

  return (
    <div className={`min-w-0 ${isRightAligned ? "text-right" : ""}`}>
      <TeamLink
        team={name}
        className={`flex min-w-0 items-center gap-2 ${
          isRightAligned ? "justify-end" : ""
        }`}
      >
        {isRightAligned ? null : <TeamFlag size="sm" teamName={name} />}

        <span
          className="min-w-0 break-words text-base font-black leading-5 text-white"
          title={showTitle ? name : undefined}
        >
          {name}
        </span>

        {isRightAligned ? <TeamFlag size="sm" teamName={name} /> : null}
      </TeamLink>
    </div>
  );
}

function CompactEmptyState({ title, description, actionLabel }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/48 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>

      {actionLabel ? (
        <Link
          to="/matches"
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
