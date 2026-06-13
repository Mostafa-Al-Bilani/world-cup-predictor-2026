import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { matchService } from "../services/matchService";
import { getSafeErrorMessage } from "../utils/errors";
import { detectLiveMatchEvents } from "../utils/liveMatchEvents";
import {
  getNextLivePollDelay,
  mergeMatchUpdates,
} from "../utils/livePolling";

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

const dispatchMatchesUpdated = (matches) => {
  window.dispatchEvent(
    new CustomEvent(MATCHES_UPDATED_EVENT, {
      detail: { matches },
    }),
  );
};

const showDetectedEvents = ({ previousMatches, updatedMatches }) => {
  if (!previousMatches?.length || !updatedMatches?.length) return;

  const previousById = new Map(
    previousMatches.map((match) => [match.id, match]),
  );

  updatedMatches.forEach((nextMatch) => {
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
};

export function useLiveMatchNotifications() {
  const previousMatchesRef = useRef(null);
  const pollingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const clearScheduledPoll = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextPoll = (matches) => {
      if (cancelled) return;

      clearScheduledPoll();

      const delay = getNextLivePollDelay(matches);

      timeoutId = window.setTimeout(() => {
        pollMatches();
      }, delay);
    };

    const pollMatches = async ({ forceFullRefresh = false } = {}) => {
      if (cancelled || pollingRef.current) return;

      if (document.visibilityState !== "visible") {
        clearScheduledPoll();
        return;
      }

      pollingRef.current = true;

      try {
        const previousMatches = previousMatchesRef.current;
        const shouldLoadAllMatches =
          forceFullRefresh || !Array.isArray(previousMatches);

        const updatedMatches = shouldLoadAllMatches
          ? await matchService.getMatches()
          : await matchService.getMatchesForLivePolling();

        if (cancelled) return;

        const nextMatches = shouldLoadAllMatches
          ? updatedMatches
          : mergeMatchUpdates(previousMatches, updatedMatches);

        dispatchMatchesUpdated(nextMatches);

        if (!shouldLoadAllMatches) {
          showDetectedEvents({
            previousMatches,
            updatedMatches,
          });
        }

        previousMatchesRef.current = nextMatches;
        scheduleNextPoll(nextMatches);
      } catch (error) {
        console.warn(
          getSafeErrorMessage(error, "Could not poll live match updates."),
        );

        scheduleNextPoll(previousMatchesRef.current ?? []);
      } finally {
        pollingRef.current = false;
      }
    };

    pollMatches({ forceFullRefresh: true });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollMatches({
          forceFullRefresh: !Array.isArray(previousMatchesRef.current),
        });
        return;
      }

      clearScheduledPoll();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearScheduledPoll();
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, []);
}

export { MATCHES_UPDATED_EVENT };
