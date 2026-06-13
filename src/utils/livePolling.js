const NORMALIZED_LIVE_STATUSES = new Set([
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

export const FAST_POLL_INTERVAL_MS = 20_000;
export const NEAR_KICKOFF_POLL_INTERVAL_MS = 60_000;
export const IDLE_POLL_INTERVAL_MS = 15 * 60_000;
export const NEAR_KICKOFF_WINDOW_MS = 30 * 60_000;
export const POST_KICKOFF_GRACE_MS = 2 * 60 * 60_000;

export const normalizePollingStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const isLivePollingStatus = (status) =>
  NORMALIZED_LIVE_STATUSES.has(normalizePollingStatus(status));

export const hasLiveMatch = (matches = []) =>
  matches.some((match) => isLivePollingStatus(match?.status));

const getKickoffTime = (match) => {
  const kickoffTime = new Date(match?.match_date).getTime();
  return Number.isFinite(kickoffTime) ? kickoffTime : null;
};

const sortByKickoff = (matches) =>
  [...matches].sort((first, second) => {
    const firstKickoff = getKickoffTime(first) ?? Number.POSITIVE_INFINITY;
    const secondKickoff = getKickoffTime(second) ?? Number.POSITIVE_INFINITY;

    return firstKickoff - secondKickoff;
  });

export function mergeMatchUpdates(currentMatches = [], updatedMatches = []) {
  const matchesById = new Map(
    currentMatches
      .filter((match) => match?.id)
      .map((match) => [match.id, match]),
  );

  updatedMatches.forEach((update) => {
    if (!update?.id) return;

    matchesById.set(update.id, {
      ...(matchesById.get(update.id) ?? {}),
      ...update,
    });
  });

  return sortByKickoff([...matchesById.values()]);
}

export function getNextLivePollDelay(
  matches = [],
  {
    now = Date.now(),
    fastInterval = FAST_POLL_INTERVAL_MS,
    nearKickoffInterval = NEAR_KICKOFF_POLL_INTERVAL_MS,
    idleInterval = IDLE_POLL_INTERVAL_MS,
    nearKickoffWindow = NEAR_KICKOFF_WINDOW_MS,
    postKickoffGrace = POST_KICKOFF_GRACE_MS,
  } = {},
) {
  if (hasLiveMatch(matches)) {
    return fastInterval;
  }

  const upcomingKickoffs = matches
    .filter(
      (match) => normalizePollingStatus(match?.status) === "upcoming",
    )
    .map(getKickoffTime)
    .filter((kickoffTime) => kickoffTime !== null)
    .sort((first, second) => first - second);

  const recentlyStartedUpcomingMatch = upcomingKickoffs.some(
    (kickoffTime) =>
      kickoffTime <= now && kickoffTime >= now - postKickoffGrace,
  );

  if (recentlyStartedUpcomingMatch) {
    return nearKickoffInterval;
  }

  const nextKickoff = upcomingKickoffs.find((kickoffTime) => kickoffTime > now);

  if (nextKickoff === undefined) {
    return idleInterval;
  }

  const timeUntilNearKickoff = nextKickoff - now - nearKickoffWindow;

  if (timeUntilNearKickoff <= 0) {
    return nearKickoffInterval;
  }

  return Math.min(
    idleInterval,
    Math.max(nearKickoffInterval, timeUntilNearKickoff),
  );
}
