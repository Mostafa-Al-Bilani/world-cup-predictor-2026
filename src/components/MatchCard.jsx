import { CalendarDays, Clock, Lock, MapPin, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PredictionButton } from "./PredictionButton";
import { StatusBadge } from "./StatusBadge";
import { TeamFlag } from "./TeamFlag";
import { TeamLink } from "./team/TeamLink.jsx";
import { formatDateTime, isMatchLocked } from "../utils/date";
import { isPlaceholderTeamName } from "../utils/matches";
import {
  getLiveGoalEvents,
  getLivePhaseClassName,
  getLivePhaseLabel,
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
  shouldShowScoreBox,
} from "../utils/matchDisplay";
import {
  getPredictedScoreLabel,
  getPredictionLabel,
  getPredictionModeLabel,
  getPredictionStatus,
  getPredictionTotalPoints,
  matchAllowsDraw,
} from "../utils/predictions";

function getPredictionLockMessage({ match, normalizedStatus }) {
  if (
    isPlaceholderTeamName(match.team_a) ||
    isPlaceholderTeamName(match.team_b)
  ) {
    return "Prediction opens when both real teams are known.";
  }

  if (normalizedStatus === "finished") {
    return "Prediction closed — this match is finished.";
  }

  if (
    normalizedStatus === "live" ||
    normalizedStatus === "halftime" ||
    normalizedStatus === "extra_time" ||
    normalizedStatus === "penalties" ||
    normalizedStatus === "penalty_shootout"
  ) {
    return "Prediction closed — this match has already started.";
  }

  if (normalizedStatus !== "upcoming") {
    return "Prediction closed — this match is not open for predictions.";
  }

  if (isMatchLocked(match)) {
    return "Prediction closed — kickoff time has passed.";
  }

  return "";
}

function hasCompleteDraftScore(draft) {
  return (
    draft.homeScore !== "" &&
    draft.homeScore !== null &&
    draft.homeScore !== undefined &&
    draft.awayScore !== "" &&
    draft.awayScore !== null &&
    draft.awayScore !== undefined
  );
}

function getDraftScores(draft) {
  if (!hasCompleteDraftScore(draft)) {
    return null;
  }

  const homeScore = Number(draft.homeScore);
  const awayScore = Number(draft.awayScore);

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return null;
  }

  return { homeScore, awayScore };
}

function getScoreResult(draft) {
  const scores = getDraftScores(draft);
  if (!scores) return "";

  if (scores.homeScore > scores.awayScore) return "team_a";
  if (scores.homeScore < scores.awayScore) return "team_b";
  return "draw";
}

function getScoreConsistencyError({ draft, canDraw }) {
  const scoreResult = getScoreResult(draft);
  if (!scoreResult) return "";

  if (!canDraw && scoreResult === "draw") {
    return "Knockout predictions cannot use a tied score.";
  }

  if (!draft.result) return "";

  if (draft.result === scoreResult) return "";

  if (draft.result === "draw" && scoreResult !== "draw") {
    return "Draw prediction requires equal scores.";
  }

  if (draft.result === "team_a" && scoreResult !== "team_a") {
    return "The score must show the first team winning.";
  }

  if (draft.result === "team_b" && scoreResult !== "team_b") {
    return "The score must show the second team winning.";
  }

  return "Prediction result and score do not match.";
}

function getPredictionHelperMessage({
  isAuthenticated,
  locked,
  lockMessage,
  draft,
  hasCompleteScore,
  canDraw,
}) {
  if (!isAuthenticated) {
    return "Log in to save your prediction before kickoff.";
  }

  if (locked) {
    return lockMessage;
  }

  if (!hasCompleteScore) {
    return "Enter both scores. The winner/result is selected automatically.";
  }

  const consistencyError = getScoreConsistencyError({ draft, canDraw });
  if (consistencyError) {
    return consistencyError;
  }

  if (draft.result === "team_a") {
    return "First team selected automatically from the score.";
  }

  if (draft.result === "team_b") {
    return "Second team selected automatically from the score.";
  }

  if (draft.result === "draw") {
    return "Draw selected automatically from the score.";
  }

  return "Ready to save.";
}

function getSaveButtonLabel({
  busy,
  locked,
  draft,
  hasCompleteScore,
  prediction,
  canDraw,
}) {
  if (busy) return "Saving...";
  if (locked) return prediction ? "Prediction locked" : "Closed";
  if (!hasCompleteScore) return "Enter score";

  const consistencyError = getScoreConsistencyError({ draft, canDraw });
  if (consistencyError) return "Fix score";

  if (!draft.result) return "Enter score";

  return prediction ? "Update prediction" : "Save prediction";
}

export function MatchCard({
  match,
  prediction,
  onPredict,
  isAuthenticated,
  busy,
}) {
  const normalizedStatus = normalizeMatchDisplayStatus(match.status);

  const [, setLockRefreshCount] = useState(0);

  // Re-render exactly at kickoff so the card locks on time instead of
  // waiting for the next match poll.
  useEffect(() => {
    if (normalizedStatus !== "upcoming") return undefined;

    const kickoffTime = new Date(match.match_date).getTime();
    if (!Number.isFinite(kickoffTime)) return undefined;

    const delay = kickoffTime - Date.now() + 1000;
    if (delay <= 0) return undefined;

    const timeoutId = window.setTimeout(
      () => setLockRefreshCount((count) => count + 1),
      Math.min(delay, 2_147_000_000),
    );

    return () => window.clearTimeout(timeoutId);
  }, [match.match_date, normalizedStatus]);

  const hasPlaceholderTeams =
    isPlaceholderTeamName(match.team_a) || isPlaceholderTeamName(match.team_b);

  const locked =
    hasPlaceholderTeams ||
    isMatchLocked(match) ||
    normalizedStatus !== "upcoming";

  const lockMessage = getPredictionLockMessage({ match, normalizedStatus });
  const canDraw = matchAllowsDraw(match);
  const predictionStatus = getPredictionStatus(match, prediction);
  const livePhaseLabel = getLivePhaseLabel(match);
  const liveGoalEvents = getLiveGoalEvents(match);

  const [draft, setDraft] = useState({
    result: "",
    homeScore: "",
    awayScore: "",
  });

  useEffect(() => {
    setDraft({
      result: prediction?.predicted_result ?? "",
      homeScore: prediction?.predicted_home_score ?? "",
      awayScore: prediction?.predicted_away_score ?? "",
    });
  }, [
    prediction?.predicted_away_score,
    prediction?.predicted_home_score,
    prediction?.predicted_result,
  ]);

  const hasCompleteScore = hasCompleteDraftScore(draft);

  const scoreConsistencyError = getScoreConsistencyError({ draft, canDraw });

  const canSave =
    !locked &&
    !busy &&
    Boolean(draft.result) &&
    hasCompleteScore &&
    !scoreConsistencyError;

  const helperMessage = getPredictionHelperMessage({
    isAuthenticated,
    locked,
    lockMessage,
    draft,
    hasCompleteScore,
    canDraw,
  });

  const saveButtonLabel = getSaveButtonLabel({
    busy,
    locked,
    draft,
    hasCompleteScore,
    prediction,
    canDraw,
  });

  const savePrediction = (nextResult = draft.result) => {
    if (!nextResult) return;
    if (!hasCompleteScore) return;
    if (scoreConsistencyError) return;

    onPredict(match, nextResult, {
      predictedHomeScore: draft.homeScore,
      predictedAwayScore: draft.awayScore,
    });
  };

  const updateScore = (field, value) => {
    setDraft((current) => {
      const nextDraft = { ...current, [field]: value };
      const automaticResult = getScoreResult(nextDraft);

      return {
        ...nextDraft,
        result: automaticResult,
      };
    });
  };

  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40">
      <div className="bg-pitch-lines bg-[length:32px_32px] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge label={match.status} />
          <StatusBadge label={predictionStatus} />
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <TeamName name={match.team_a} />

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
            VS
          </span>

          <TeamName name={match.team_b} align="right" />
        </div>

        {shouldShowScoreBox(match) ? (
          <div
            className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center"
            aria-live={isMatchInLivePhase(match) ? "polite" : undefined}
          >
            <p className="text-2xl font-black">
              {match.team_a_score ?? "-"} : {match.team_b_score ?? "-"}
              {livePhaseLabel ? (
                <span
                  className={`ml-2 align-middle text-xs font-bold ${getLivePhaseClassName(
                    match,
                  )}`}
                >
                  {livePhaseLabel}
                </span>
              ) : null}
            </p>

            {liveGoalEvents.length ? (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/10 pt-3 text-xs text-slate-300">
                <GoalEventList
                  events={liveGoalEvents.filter(
                    (event) => event.side === "team_a",
                  )}
                />

                <GoalEventList
                  align="right"
                  events={liveGoalEvents.filter(
                    (event) => event.side === "team_b",
                  )}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-300" />
            {formatDateTime(match.match_date)}
          </span>

          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-gold-300" />
            {match.stage}
          </span>

          <span className="flex items-center gap-2 sm:col-span-2">
            <MapPin size={16} className="text-sky-300" />
            {match.venue}, {match.city}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            {getPredictionModeLabel(match)}
          </p>

          <p className="mt-2 text-sm font-bold text-white">
            {getPredictionLabel(match, prediction?.predicted_result)}
          </p>

          <p className="mt-1 text-sm text-slate-300">
            Score pick: {getPredictedScoreLabel(prediction)}
          </p>

          {locked ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-300/20 bg-slate-300/10 p-3 text-sm text-slate-200">
              <Lock size={16} className="mt-0.5 shrink-0 text-slate-300" />
              <span>{lockMessage}</span>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
              <Clock size={16} className="mt-0.5 shrink-0 text-emerald-300" />
              <span>Open for predictions until kickoff.</span>
            </div>
          )}

          {isAuthenticated ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <PredictionButton
                  label={<PredictionLabel name={match.team_a} />}
                  selected={draft.result === "team_a"}
                  disabled={locked || busy}
                  readOnly
                />

                {canDraw ? (
                  <PredictionButton
                    label="Draw"
                    selected={draft.result === "draw"}
                    disabled={locked || busy}
                    readOnly
                  />
                ) : null}

                <PredictionButton
                  label={<PredictionLabel name={match.team_b} />}
                  selected={draft.result === "team_b"}
                  disabled={locked || busy}
                  readOnly
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_84px_84px] sm:items-end">
                <p
                  className={`text-xs leading-5 ${
                    scoreConsistencyError
                      ? "text-rose-200"
                      : draft.result && hasCompleteScore
                        ? "text-emerald-200"
                        : "text-slate-400"
                  }`}
                >
                  {helperMessage}
                </p>

                <ScoreInput
                  label={match.team_a}
                  value={draft.homeScore}
                  disabled={locked || busy}
                  onChange={(value) => updateScore("homeScore", value)}
                />

                <ScoreInput
                  label={match.team_b}
                  value={draft.awayScore}
                  disabled={locked || busy}
                  onChange={(value) => updateScore("awayScore", value)}
                />
              </div>

              <button
                type="button"
                disabled={!canSave}
                onClick={() => savePrediction()}
                className="w-full rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveButtonLabel}
              </button>
            </div>
          ) : (
            <Link
              className="mt-4 inline-flex w-full justify-center rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-white"
              to="/login"
            >
              Log in to predict
            </Link>
          )}

          {normalizedStatus === "finished" && prediction ? (
            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              <PointPill
                label="Winner"
                value={
                  prediction.winner_points ??
                  Number(prediction.is_correct === true)
                }
              />

              <PointPill
                label="Exact bonus"
                value={prediction.exact_score_points ?? 0}
              />

              <PointPill
                label="Total"
                value={getPredictionTotalPoints(prediction)}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ScoreInput({ label, value, disabled, onChange }) {
  return (
    <label className="block">
      <span className="block truncate text-xs font-bold text-slate-400">
        {label}
      </span>

      <input
        type="number"
        min="0"
        max="99"
        step="1"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-black text-white outline-none placeholder:text-slate-500 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        placeholder="-"
      />
    </label>
  );
}

function GoalEventList({ events, align = "left" }) {
  return (
    <ul
      className={`min-w-0 space-y-1 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {events.map((event, index) => (
        <li key={index} className="truncate font-semibold">
          {event.minute ? (
            <span className="text-emerald-200">{event.minute} </span>
          ) : null}
          {event.player ?? "Goal"}
          {event.ownGoal ? (
            <span className="text-slate-400"> (o.g.)</span>
          ) : null}
          {event.penalty ? (
            <span className="text-slate-400"> (pen.)</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function PointPill({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-950/70 px-3 py-2 text-center">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function PredictionLabel({ name }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <TeamFlag size="sm" teamName={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function TeamName({ name, align = "left" }) {
  return (
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0"}>
      <TeamLink
        team={name}
        className={`inline-block ${align === "right" ? "ml-auto" : ""}`}
      >
        <TeamFlag
          className={`mb-3 ${align === "right" ? "ml-auto" : ""}`}
          size="xl"
          teamName={name}
          variant="premium"
        />

        <h3 className="break-words text-lg font-black text-white sm:text-xl">
          {name}
        </h3>
      </TeamLink>
    </div>
  );
}
