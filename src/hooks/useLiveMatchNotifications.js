import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { matchService } from "../services/matchService";
import { getSafeErrorMessage } from "../utils/errors";
import { detectLiveMatchEvents } from "../utils/liveMatchEvents";

const POLL_INTERVAL_MS = 20000;
const MATCHES_UPDATED_EVENT = "wc26:matches-updated";

const showGoalToast = ({ match, team }) => {
  toast.success(
    `GOAL: ${team} scored! ${match.team_a} ${match.team_a_score ?? 0} - ${
      match.team_b_score ?? 0
    } ${match.team_b}`,
    {
      duration: 7000,
      icon: "⚽",
    },
  );
};

const showPhaseToast = ({ match, type }) => {
  if (type === "extra_time") {
    toast(`Extra time started: ${match.team_a} vs ${match.team_b}`, {
      duration: 7000,
      icon: "⏱️",
    });
  }

  if (type === "penalties") {
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

          const events = detectLiveMatchEvents({
            previousMatch,
            nextMatch,
          });

          events.forEach((event) => {
            if (event.type === "goal") {
              showGoalToast({
                match: event.match,
                team: event.team,
              });
              return;
            }

            showPhaseToast({
              match: event.match,
              type: event.type,
            });
          });
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