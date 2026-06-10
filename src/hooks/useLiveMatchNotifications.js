import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { matchService } from "../services/matchService";
import { getSafeErrorMessage } from "../utils/errors";

const POLL_INTERVAL_MS = 30000;
const MATCHES_UPDATED_EVENT = "wc26:matches-updated";

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const getMatchPhase = (match) => {
  const text = [
    match.status,
    match.period,
    match.game_state,
    match.status_detail,
    match.status_description,
    match.display_status,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  if (
    text.includes("penalties") ||
    text.includes("penalty") ||
    text.includes("shootout") ||
    text.includes("pso")
  ) {
    return "penalties";
  }

  if (
    text.includes("extra time") ||
    text.includes("extratime") ||
    text === "et" ||
    text.includes(" et ")
  ) {
    return "extra_time";
  }

  if (text.includes("half")) return "halftime";
  if (text.includes("live") || text.includes("in progress")) return "live";
  if (text.includes("finished") || text.includes("final")) return "finished";

  return normalizeText(match.status);
};

const getScore = (match) => ({
  teamA: toNumber(match.team_a_score),
  teamB: toNumber(match.team_b_score),
});

const showGoalToast = ({ match, scoringTeam }) => {
  toast.success(
    `GOAL: ${scoringTeam} scored! ${match.team_a} ${
      match.team_a_score ?? 0
    } - ${match.team_b_score ?? 0} ${match.team_b}`,
    {
      duration: 7000,
      icon: "⚽",
    },
  );
};

const showPhaseToast = ({ match, phase }) => {
  if (phase === "extra_time") {
    toast(`Extra time started: ${match.team_a} vs ${match.team_b}`, {
      duration: 7000,
      icon: "⏱️",
    });
  }

  if (phase === "penalties") {
    toast(`Penalty shootout started: ${match.team_a} vs ${match.team_b}`, {
      duration: 7000,
      icon: "🥅",
    });
  }
};

export function useLiveMatchNotifications() {
  const previousMatchesRef = useRef(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId = null;

    const pollMatches = async () => {
      if (cancelled || pollingRef.current) return;
      if (document.visibilityState !== "visible") return;

      pollingRef.current = true;

      try {
        const nextMatches = await matchService.getMatches();

        if (cancelled) return;

        window.dispatchEvent(
          new CustomEvent(MATCHES_UPDATED_EVENT, {
            detail: { matches: nextMatches },
          }),
        );

        const previousMatches = previousMatchesRef.current;

        if (!previousMatches) {
          previousMatchesRef.current = nextMatches;
          return;
        }

        const previousById = new Map(
          previousMatches.map((match) => [match.id, match]),
        );

        nextMatches.forEach((nextMatch) => {
          const previousMatch = previousById.get(nextMatch.id);
          if (!previousMatch) return;

          const previousScore = getScore(previousMatch);
          const nextScore = getScore(nextMatch);

          if (nextScore.teamA > previousScore.teamA) {
            showGoalToast({
              match: nextMatch,
              scoringTeam: nextMatch.team_a,
            });
          }

          if (nextScore.teamB > previousScore.teamB) {
            showGoalToast({
              match: nextMatch,
              scoringTeam: nextMatch.team_b,
            });
          }

          const previousPhase = getMatchPhase(previousMatch);
          const nextPhase = getMatchPhase(nextMatch);

          if (previousPhase !== nextPhase) {
            if (nextPhase === "extra_time" || nextPhase === "penalties") {
              showPhaseToast({
                match: nextMatch,
                phase: nextPhase,
              });
            }
          }
        });

        previousMatchesRef.current = nextMatches;
      } catch (error) {
        console.warn(
          getSafeErrorMessage(error, "Could not poll live match updates."),
        );
      } finally {
        pollingRef.current = false;
      }
    };

    pollMatches();
    intervalId = window.setInterval(pollMatches, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollMatches();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}

export { MATCHES_UPDATED_EVENT };