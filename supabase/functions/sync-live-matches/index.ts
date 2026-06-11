import { createClient } from "@supabase/supabase-js";

type MatchRow = {
  id: string;
  match_number: number | null;
  team_a: string;
  team_b: string;
  match_date: string;
  stage: string;
  status: string;
  team_a_score: number | null;
  team_b_score: number | null;
  result: "team_a" | "draw" | "team_b" | null;
  venue: string | null;
  city: string | null;
  elapsed: number | null;
  status_detail: string | null;
  halftime_team_a_score: number | null;
  halftime_team_b_score: number | null;
  provider_name: string | null;
  provider_fixture_id: string | null;
  last_synced_at: string | null;
};

type EspnScoreboardResponse = {
  events?: EspnEvent[];
};

type EspnEvent = {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: {
    clock?: number;
    displayClock?: string;
    period?: number;
    type?: {
      id?: string;
      name?: string;
      state?: string;
      completed?: boolean;
      description?: string;
      detail?: string;
      shortDetail?: string;
    };
  };
  competitions?: Array<{
    id?: string;
    date?: string;
    venue?: {
      fullName?: string;
      address?: {
        city?: string;
        country?: string;
      };
    };
    competitors?: EspnCompetitor[];
    status?: EspnEvent["status"];
  }>;
};

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    id?: string;
    uid?: string;
    location?: string;
    name?: string;
    abbreviation?: string;
    displayName?: string;
    shortDisplayName?: string;
  };
};

type MatchUpdatePayload = {
  status: string;
  team_a_score: number | null;
  team_b_score: number | null;
  result: "team_a" | "draw" | "team_b" | null;
  elapsed: number | null;
  status_detail: string | null;
  provider_name: string;
  provider_fixture_id: string | null;
  venue: string | null;
  city: string | null;
  last_synced_at: string;
};

type SyncLogInput = {
  startedAt: Date;
  status: "success" | "error";
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  fallbackUsed: boolean;
  errorMessage?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PROVIDER_NAME = "espn";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ESPN_SCOREBOARD_URL =
  Deno.env.get("ESPN_SCOREBOARD_URL") ??
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date();

  try {
    assertEnvironment();

    const now = new Date();
    const candidateMatches = await getCandidateMatches(now);
    const dueMatches = candidateMatches.filter((match) =>
      shouldSyncMatch(match, now),
    );

    if (!dueMatches.length) {
      await insertSyncLog({
        startedAt,
        status: "success",
        insertedCount: 0,
        updatedCount: 0,
        unchangedCount: candidateMatches.length,
        failedCount: 0,
        fallbackUsed: false,
      });

      return json({
        ok: true,
        skipped: true,
        reason: "No matches are due for ESPN sync.",
        candidates: candidateMatches.length,
      });
    }

    const events = await fetchEspnEventsForMatches(dueMatches);

    let updatedCount = 0;
    let unchangedCount = 0;
    let failedCount = 0;
    let recalculatedCount = 0;

    for (const match of dueMatches) {
      const event = findEspnEventForMatch(match, events);

      if (!event) {
        failedCount += 1;
        console.warn(
          `No ESPN event match found for ${match.team_a} vs ${match.team_b}`,
        );
        continue;
      }

      const payload = mapEspnEventToMatchUpdate(match, event);
      const changed = hasMeaningfulMatchChange(match, payload);

      const { error } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", match.id);

      if (error) {
        failedCount += 1;
        console.error("Failed to update match", match.id, error);
        continue;
      }

      if (changed) {
        updatedCount += 1;
      } else {
        unchangedCount += 1;
      }

      if (payload.status === "finished" && match.status !== "finished") {
        const recalculated = await recalculateMatchPoints(match.id);
        if (recalculated) {
          recalculatedCount += 1;
        }
      }
    }

    await insertSyncLog({
      startedAt,
      status: failedCount ? "error" : "success",
      insertedCount: 0,
      updatedCount,
      unchangedCount,
      failedCount,
      fallbackUsed: false,
      errorMessage: failedCount
        ? `${failedCount} match(es) could not be synced from ESPN.`
        : undefined,
    });

    return json({
      ok: failedCount === 0,
      provider: PROVIDER_NAME,
      candidates: candidateMatches.length,
      due: dueMatches.length,
      espnEvents: events.length,
      updated: updatedCount,
      unchanged: unchangedCount,
      failed: failedCount,
      recalculated: recalculatedCount,
    });
  } catch (error) {
    console.error(error);

    await insertSyncLog({
      startedAt,
      status: "error",
      insertedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      failedCount: 1,
      fallbackUsed: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

function assertEnvironment() {
  if (!SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL.");
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
}

async function getCandidateMatches(now: Date): Promise<MatchRow[]> {
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("matches")
    .select(
      [
        "id",
        "match_number",
        "team_a",
        "team_b",
        "match_date",
        "stage",
        "status",
        "team_a_score",
        "team_b_score",
        "result",
        "venue",
        "city",
        "elapsed",
        "status_detail",
        "halftime_team_a_score",
        "halftime_team_b_score",
        "provider_name",
        "provider_fixture_id",
        "last_synced_at",
      ].join(","),
    )
    .gte("match_date", windowStart.toISOString())
    .lte("match_date", windowEnd.toISOString())
    .not("status", "in", '("finished","cancelled","postponed")')
    .order("match_date", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function shouldSyncMatch(match: MatchRow, now: Date) {
  const matchDate = new Date(match.match_date);
  const minutesUntilKickoff =
    (matchDate.getTime() - now.getTime()) / 1000 / 60;

  const normalizedStatus = normalizeStatus(match.status);
  const lastSyncedAt = match.last_synced_at
    ? new Date(match.last_synced_at)
    : null;

  if (!lastSyncedAt) return true;

  const secondsSinceLastSync =
    (now.getTime() - lastSyncedAt.getTime()) / 1000;

  if (isLiveStatus(normalizedStatus)) {
    return secondsSinceLastSync >= 45;
  }

  if (minutesUntilKickoff <= 120 && minutesUntilKickoff >= -30) {
    return secondsSinceLastSync >= 180;
  }

  if (minutesUntilKickoff <= 24 * 60 && minutesUntilKickoff > 120) {
    return secondsSinceLastSync >= 30 * 60;
  }

  return false;
}

async function fetchEspnEventsForMatches(matches: MatchRow[]) {
  const dates = [
    ...new Set(matches.map((match) => toEspnDate(match.match_date))),
  ];

  const events: EspnEvent[] = [];

  for (const date of dates) {
    const url = new URL(ESPN_SCOREBOARD_URL);
    url.searchParams.set("dates", date);
    url.searchParams.set("limit", "200");

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `ESPN API error ${response.status}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as EspnScoreboardResponse;
    events.push(...(body.events ?? []));
  }

  return dedupeEvents(events);
}

function findEspnEventForMatch(match: MatchRow, events: EspnEvent[]) {
  if (match.provider_fixture_id) {
    const byId = events.find(
      (event) => String(event.id) === String(match.provider_fixture_id),
    );

    if (byId) return byId;
  }

  const matchTime = new Date(match.match_date).getTime();
  const teamA = normalizeTeamName(match.team_a);
  const teamB = normalizeTeamName(match.team_b);

  return events.find((event) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors ?? [];
    const eventTime = new Date(
      competition?.date ?? event.date ?? "",
    ).getTime();

    if (!Number.isFinite(eventTime)) return false;

    const timeCloseEnough =
      Math.abs(eventTime - matchTime) <= 4 * 60 * 60 * 1000;

    const home = getCompetitorByHomeAway(competitors, "home");
    const away = getCompetitorByHomeAway(competitors, "away");

    const homeName = normalizeTeamName(getTeamDisplayName(home));
    const awayName = normalizeTeamName(getTeamDisplayName(away));

    const sameOrder = homeName === teamA && awayName === teamB;
    const reversedOrder = homeName === teamB && awayName === teamA;

    return timeCloseEnough && (sameOrder || reversedOrder);
  });
}

function mapEspnEventToMatchUpdate(
  match: MatchRow,
  event: EspnEvent,
): MatchUpdatePayload {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const eventStatus = competition?.status ?? event.status;

  const home = getCompetitorByHomeAway(competitors, "home");
  const away = getCompetitorByHomeAway(competitors, "away");

  const homeName = normalizeTeamName(getTeamDisplayName(home));
  const awayName = normalizeTeamName(getTeamDisplayName(away));
  const teamA = normalizeTeamName(match.team_a);
  const teamB = normalizeTeamName(match.team_b);

  const reversed = homeName === teamB && awayName === teamA;

  const homeScore = parseScore(home?.score);
  const awayScore = parseScore(away?.score);

  const teamAScore = reversed ? awayScore : homeScore;
  const teamBScore = reversed ? homeScore : awayScore;

  const status = mapEspnStatus(eventStatus);
  const result = getResult(status, teamAScore, teamBScore);

  const venue = competition?.venue?.fullName ?? match.venue ?? null;
  const city = competition?.venue?.address?.city ?? match.city ?? null;

  return {
    status,
    team_a_score: teamAScore,
    team_b_score: teamBScore,
    result,
    elapsed: getElapsed(eventStatus),
    status_detail: getStatusDetail(eventStatus),
    provider_name: PROVIDER_NAME,
    provider_fixture_id: event.id ?? match.provider_fixture_id ?? null,
    venue,
    city,
    last_synced_at: new Date().toISOString(),
  };
}

function mapEspnStatus(status: EspnEvent["status"]) {
  const state = normalizeStatus(status?.type?.state);
  const name = normalizeStatus(status?.type?.name);
  const description = normalizeStatus(status?.type?.description);
  const detail = normalizeStatus(status?.type?.detail);
  const shortDetail = normalizeStatus(status?.type?.shortDetail);

  const combined = [state, name, description, detail, shortDetail].join(" ");

  if (status?.type?.completed || state === "post") return "finished";

  if (combined.includes("halftime") || combined.includes("half_time")) {
    return "halftime";
  }

  if (combined.includes("extra_time") || combined.includes("overtime")) {
    return "extra_time";
  }

  if (combined.includes("penalty")) {
    return "penalties";
  }

  if (
    state === "in" ||
    combined.includes("in_progress") ||
    combined.includes("first_half") ||
    combined.includes("second_half")
  ) {
    return "live";
  }

  if (combined.includes("postponed")) return "postponed";
  if (combined.includes("cancelled") || combined.includes("canceled")) {
    return "cancelled";
  }

  return "upcoming";
}

function getElapsed(status: EspnEvent["status"]) {
  if (typeof status?.clock === "number" && Number.isFinite(status.clock)) {
    return Math.floor(status.clock);
  }

  const displayClock = status?.displayClock ?? "";
  const match = displayClock.match(/\d+/);

  if (!match) return null;

  const elapsed = Number(match[0]);
  return Number.isFinite(elapsed) ? elapsed : null;
}

function getStatusDetail(status: EspnEvent["status"]) {
  return (
    status?.type?.shortDetail ??
    status?.type?.detail ??
    status?.type?.description ??
    status?.type?.name ??
    null
  );
}

function getResult(
  status: string,
  teamAScore: number | null,
  teamBScore: number | null,
): "team_a" | "draw" | "team_b" | null {
  if (status !== "finished") return null;
  if (teamAScore === null || teamBScore === null) return null;

  if (teamAScore > teamBScore) return "team_a";
  if (teamAScore < teamBScore) return "team_b";
  return "draw";
}

function hasMeaningfulMatchChange(
  match: MatchRow,
  payload: MatchUpdatePayload,
) {
  return (
    match.status !== payload.status ||
    match.team_a_score !== payload.team_a_score ||
    match.team_b_score !== payload.team_b_score ||
    match.result !== payload.result ||
    match.elapsed !== payload.elapsed ||
    match.status_detail !== payload.status_detail ||
    match.provider_name !== payload.provider_name ||
    String(match.provider_fixture_id ?? "") !==
      String(payload.provider_fixture_id ?? "") ||
    match.venue !== payload.venue ||
    match.city !== payload.city
  );
}

async function recalculateMatchPoints(matchId: string) {
  const { error } = await supabase.rpc("recalculate_match_points", {
    target_match_id: matchId,
  });

  if (error) {
    console.error("Could not recalculate match points", matchId, error);
    return false;
  }

  return true;
}

async function insertSyncLog({
  startedAt,
  status,
  insertedCount,
  updatedCount,
  unchangedCount,
  failedCount,
  fallbackUsed,
  errorMessage,
}: SyncLogInput) {
  const { error } = await supabase.from("sync_logs").insert({
    provider: PROVIDER_NAME,
    fallback_used: fallbackUsed,
    status,
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
    inserted_count: insertedCount,
    updated_count: updatedCount,
    unchanged_count: unchangedCount,
    recalculated_count: 0,
    failed_count: failedCount,
    error_message: errorMessage ?? null,
  });

  if (error) {
    console.error("Could not insert sync log", error);
  }
}

function getCompetitorByHomeAway(
  competitors: EspnCompetitor[],
  homeAway: "home" | "away",
) {
  return competitors.find((competitor) => competitor.homeAway === homeAway);
}

function getTeamDisplayName(competitor?: EspnCompetitor) {
  return (
    competitor?.team?.displayName ??
    competitor?.team?.shortDisplayName ??
    competitor?.team?.name ??
    competitor?.team?.location ??
    ""
  );
}

function parseScore(score: string | undefined) {
  if (score === undefined || score === null || score === "") return null;

  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

function toEspnDate(dateValue: string) {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function normalizeStatus(status: string | undefined | null) {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isLiveStatus(status: string) {
  return [
    "live",
    "halftime",
    "extra_time",
    "penalties",
    "penalty_shootout",
  ].includes(status);
}

function normalizeTeamName(teamName: string | undefined | null) {
  return String(teamName ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/\busa\b/g, "united states")
    .replace(/\bus\b/g, "united states")
    .replace(/\bsouth korea\b/g, "korea republic")
    .replace(/\bczechia\b/g, "czech republic")
    .replace(/\bturkiye\b/g, "turkey")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeEvents(events: EspnEvent[]) {
  const byId = new Map<string, EspnEvent>();

  for (const event of events) {
    if (!event.id) continue;
    byId.set(String(event.id), event);
  }

  return [...byId.values()];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}