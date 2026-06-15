import {
  CalendarDays,
  ChevronRight,
  Clock,
  Radio,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MatchCard } from "./MatchCard";
import { StatusBadge } from "./StatusBadge";
import { TeamFlag } from "./TeamFlag";
import { formatDateTime, getUserTimeZone } from "../utils/date";
import {
  getLivePhaseLabel,
  normalizeMatchDisplayStatus,
} from "../utils/matchDisplay";
import { getPredictionSummary } from "../utils/predictions";

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
  isAuthenticated,
  busyMatchId,
  onPredict,
}) {
  const timeZone = getUserTimeZone();

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

      {liveMatches.length ? (
        <LiveMatchesArea
          liveMatches={liveMatches}
          predictionByMatch={predictionByMatch}
          isAuthenticated={isAuthenticated}
          busyMatchId={busyMatchId}
          onPredict={onPredict}
        />
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <MatchWindowPanel
          title="Last 24 hours"
          description="Completed matches from the previous day."
          className="order-2 md:order-1"
        >
          {recentMatches.length ? (
            recentMatches.map((match) => (
              <RecentCompletedCard key={match.id} match={match} />
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
          className="order-1 md:order-2"
        >
          {nextMatches.length ? (
            nextMatches.map((match) => (
              <UpcomingCompactCard
                key={match.id}
                match={match}
                prediction={predictionByMatch.get(match.id)}
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

function LiveMatchesArea({
  liveMatches,
  predictionByMatch,
  isAuthenticated,
  busyMatchId,
  onPredict,
}) {
  const hasMultipleLiveMatches = liveMatches.length > 1;

  return (
    <div className="mt-6 rounded-xl border border-emerald-300/50 bg-emerald-300/[0.12] p-4 shadow-[0_0_45px_rgba(52,211,153,0.16)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/40 bg-emerald-200/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-200 motion-safe:animate-pulse" />
            Live now
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            {liveMatches.length === 1
              ? "Current live match"
              : "Current live matches"}
          </h3>
        </div>

        <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-100">
          <Radio size={16} />
          Scores update here as live polling receives changes.
        </p>
      </div>

      <div className="mt-5 flex justify-center">
        <div
          className={
            hasMultipleLiveMatches
              ? "grid w-full max-w-6xl gap-5 md:grid-cols-2"
              : "w-full max-w-3xl"
          }
        >
          {liveMatches.map((match) => {
            const livePhaseLabel = getLivePhaseLabel(match);

            return (
              <div
                key={match.id}
                className="overflow-hidden rounded-lg border border-emerald-300/60 shadow-[0_0_35px_rgba(52,211,153,0.24)] ring-2 ring-emerald-300/50 ring-offset-4 ring-offset-slate-950"
              >
                {livePhaseLabel ? (
                  <div className="bg-emerald-300 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-950">
                    LIVE NOW - {livePhaseLabel}
                  </div>
                ) : (
                  <div className="bg-emerald-300 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.2em] text-emerald-950">
                    LIVE NOW
                  </div>
                )}

                <MatchCard
                  match={match}
                  prediction={predictionByMatch.get(match.id)}
                  isAuthenticated={isAuthenticated}
                  busy={busyMatchId === match.id}
                  onPredict={onPredict}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MatchWindowPanel({ title, description, className, children }) {
  return (
    <section
      className={`min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-4 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-black text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>

      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function RecentCompletedCard({ match }) {
  return (
    <CompactMatchCard
      match={match}
      statusLabel={getStatusLabel(match)}
      statusTone="finished"
      centerContent={
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
            Final
          </p>
          <p className="mt-1 whitespace-nowrap text-xl font-black text-white">
            {getFinalScore(match)}
          </p>
        </div>
      }
      detail={
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Clock size={15} className="shrink-0 text-emerald-300" />
          {formatDateTime(match.match_date)}
        </span>
      }
      actionLabel="View match"
    />
  );
}

function UpcomingCompactCard({ match, prediction }) {
  return (
    <CompactMatchCard
      match={match}
      statusLabel={getStatusLabel(match)}
      centerContent={
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
          VS
        </span>
      }
      detail={
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <CalendarDays size={15} className="shrink-0 text-emerald-300" />
          {formatDateTime(match.match_date)}
        </span>
      }
      note={
        prediction
          ? `Your pick: ${getPredictionSummary(match, prediction)}`
          : "No prediction yet"
      }
      actionLabel={prediction ? "View prediction" : "Predict"}
    />
  );
}

function CompactMatchCard({
  match,
  statusLabel,
  statusTone = "neutral",
  centerContent,
  detail,
  note,
  actionLabel,
}) {
  return (
    <article className="min-w-0 rounded-lg border border-white/10 bg-slate-950/64 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="inline-flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          <Trophy size={14} className="shrink-0 text-gold-300" />
          <span className="min-w-0 truncate">{match.stage}</span>
        </p>

        <StatusBadge label={statusLabel} tone={statusTone} />
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <CompactTeamName name={match.team_a} />
        {centerContent}
        <CompactTeamName name={match.team_b} align="right" />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="min-w-0 break-words">{detail}</p>

          {note ? (
            <p className="min-w-0 break-words text-sm font-semibold text-slate-200">
              {note}
            </p>
          ) : null}
        </div>

        <Link
          to={`/matches?match=${match.id}`}
          className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-1 rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 sm:w-auto"
        >
          {actionLabel} <ChevronRight size={16} />
        </Link>
      </div>
    </article>
  );
}

function CompactTeamName({ name, align = "left" }) {
  const isRightAligned = align === "right";

  return (
    <div className={`min-w-0 ${isRightAligned ? "text-right" : ""}`}>
      <div
        className={`flex min-w-0 items-center gap-2 ${
          isRightAligned ? "justify-end" : ""
        }`}
      >
        {isRightAligned ? null : <TeamFlag size="sm" teamName={name} />}

        <span className="min-w-0 break-words text-sm font-black leading-5 text-white">
          {name}
        </span>

        {isRightAligned ? <TeamFlag size="sm" teamName={name} /> : null}
      </div>
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
          className="mt-3 inline-flex min-h-10 items-center rounded-full border border-white/15 px-4 py-2 text-sm font-black text-emerald-200 transition hover:border-emerald-300/50 hover:text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
