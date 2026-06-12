import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronRight,
  Medal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { MatchCard } from "../components/MatchCard";
import { TopThreePodium } from "../components/TopThreePodium";
import { useAuth } from "../context/AuthContext";
import { groupService } from "../services/groupService";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";
import { profileService } from "../services/profileService";
import { supabase } from "../services/supabaseClient";
import { formatDateTime, getTimeRemaining, isMatchLocked } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import { getAccuracy, getPredictionTotalPoints } from "../utils/predictions";
import { MATCHES_UPDATED_EVENT } from "../hooks/useLiveMatchNotifications";

const features = [
  {
    title: "Predict matches",
    description:
      "Pick the result or final winner and add an exact score before kickoff.",
    icon: ShieldCheck,
  },
  {
    title: "Earn points",
    description:
      "Get points for correct winners, exact scores, bracket picks, and champion prediction.",
    icon: Medal,
  },
  {
    title: "Climb the scoreboard",
    description:
      "Track your total points, accuracy, and rank during the tournament.",
    icon: Trophy,
  },
  {
    title: "Compete with friends",
    description:
      "Create groups and compare your score against people you know.",
    icon: Users,
  },
];

function isPlaceholderTeamName(teamName) {
  const text = String(teamName ?? "")
    .trim()
    .toLowerCase();

  return (
    !text ||
    text === "tbd" ||
    text.includes("group ") ||
    text.includes("winner") ||
    text.includes("runner-up") ||
    text.includes("runner up") ||
    text.includes("2nd place") ||
    text.includes("3rd place") ||
    text.includes("third place")
  );
}

function hasRealTeams(match) {
  return (
    !isPlaceholderTeamName(match.team_a) && !isPlaceholderTeamName(match.team_b)
  );
}

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const isLiveMatchStatus = (status) =>
  ["live", "halftime", "extra_time", "penalties", "penalty_shootout"].includes(
    normalizeStatus(status),
  );

async function getChampionPick(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("world_cup_winner_predictions")
    .select(
      "id,user_id,predicted_team,points_awarded,locked_at,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated } = useAuth();

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [championPrediction, setChampionPrediction] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [tick, setTick] = useState(Date.now());

  const loadDashboard = useCallback(async () => {
    const [
      matchRows,
      leaderRows,
      predictionRows,
      championPredictionRow,
      invitationRows,
    ] = await Promise.all([
      matchService.getMatches(),
      profileService.getLeaderboard(),
      user?.id
        ? predictionService.getPredictionsForUser(user.id)
        : Promise.resolve([]),
      user?.id
        ? getChampionPick(user.id).catch(() => null)
        : Promise.resolve(null),
      user?.id
        ? groupService.getPendingInvitations(user.id).catch(() => [])
        : Promise.resolve([]),
    ]);

    setMatches(matchRows);
    setLeaders(leaderRows);
    setPredictions(predictionRows);
    setChampionPrediction(championPredictionRow);
    setPendingInvitations(invitationRows);
  }, [user?.id]);

  useEffect(() => {
    const handleMatchesUpdated = (event) => {
      if (Array.isArray(event.detail?.matches)) {
        setMatches(event.detail.matches);
      }
    };

    window.addEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);

    return () => {
      window.removeEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);
    };
  }, []);

  useEffect(() => {
    loadDashboard().catch(() => undefined);

    const intervalId = window.setInterval(() => {
      loadDashboard().catch(() => undefined);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter(hasRealTeams)
        .filter(
          (match) =>
            normalizeStatus(match.status) === "upcoming" &&
            new Date(match.match_date).getTime() > tick,
        )
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date)),
    [matches, tick],
  );

  const liveMatches = useMemo(
    () =>
      matches
        .filter(hasRealTeams)
        .filter((match) => isLiveMatchStatus(match.status))
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date)),
    [matches],
  );

  const predictionByMatch = useMemo(
    () =>
      new Map(
        predictions.map((prediction) => [prediction.match_id, prediction]),
      ),
    [predictions],
  );

  const nextMatch = upcomingMatches[0];
  const remaining = nextMatch ? getTimeRemaining(nextMatch.match_date) : null;

  const missingPredictions = useMemo(
    () => upcomingMatches.filter((match) => !predictionByMatch.has(match.id)),
    [predictionByMatch, upcomingMatches],
  );

  const nextPredictionNeeded = missingPredictions[0];

  const handlePredict = async (match, predictedResult, scoreDraft = {}) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/matches" } });
      return;
    }

    if (isMatchLocked(match) || normalizeStatus(match.status) !== "upcoming") {
      toast.error("Predictions are locked for this match.");
      return;
    }

    setBusyMatchId(match.id);

    try {
      const saved = await predictionService.upsertPrediction({
        userId: user.id,
        matchId: match.id,
        predictedResult,
        predictedHomeScore: scoreDraft.predictedHomeScore,
        predictedAwayScore: scoreDraft.predictedAwayScore,
      });

      setPredictions((items) => [
        ...items.filter((prediction) => prediction.match_id !== match.id),
        saved,
      ]);

      toast.success(`Saved: ${match.team_a} vs ${match.team_b}`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not save prediction."));
    } finally {
      setBusyMatchId(null);
    }
  };

  if (isAuthenticated) {
    return (
      <DashboardHome
        profile={profile}
        championPrediction={championPrediction}
        leaders={leaders}
        predictions={predictions}
        upcomingMatches={upcomingMatches}
        missingPredictions={missingPredictions}
        pendingInvitations={pendingInvitations}
        nextMatch={nextMatch}
        nextPredictionNeeded={nextPredictionNeeded}
        remaining={remaining}
        predictionByMatch={predictionByMatch}
        liveMatches={liveMatches}
        busyMatchId={busyMatchId}
        isAuthenticated={isAuthenticated}
        handlePredict={handlePredict}
      />
    );
  }

  return (
    <PublicHome
      leaders={leaders}
      upcomingMatches={upcomingMatches}
      liveMatches={liveMatches}
      nextMatch={nextMatch}
      remaining={remaining}
    />
  );
}

function DashboardHome({
  profile,
  championPrediction,
  leaders,
  predictions,
  upcomingMatches,
  missingPredictions,
  pendingInvitations,
  nextMatch,
  nextPredictionNeeded,
  remaining,
  predictionByMatch,
  liveMatches,
  busyMatchId,
  isAuthenticated,
  handlePredict,
}) {
  const totalPredictionPoints = predictions.reduce(
    (sum, prediction) => sum + getPredictionTotalPoints(prediction),
    0,
  );

  const correctPredictions = predictions.filter(
    (prediction) => prediction.is_correct === true,
  ).length;

  const exactScores = predictions.filter(
    (prediction) => Number(prediction.exact_score_points ?? 0) > 0,
  ).length;

  const totalPoints =
    profile?.total_points ?? profile?.points ?? totalPredictionPoints;

  const accuracy = getAccuracy({
    correct_predictions: profile?.correct_predictions ?? correctPredictions,
    total_predictions: profile?.total_predictions ?? predictions.length,
  });

  const pendingInvitationCount = pendingInvitations.length;
  const firstInvitation = pendingInvitations[0];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            Your dashboard
          </p>

          <h1 className="mt-3 text-[2.6rem] font-black leading-tight sm:text-5xl">
            Welcome back.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track your score, complete missing predictions, and follow the next
            World Cup match from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-glow transition hover:bg-white"
            to="/matches"
          >
            Predict matches <ChevronRight size={18} />
          </Link>

          <Link
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950"
            to="/my-predictions"
          >
            My predictions <Target size={18} />
          </Link>
        </div>
      </section>

      {pendingInvitationCount ? (
        <section className="mt-8 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-5 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Group invitation
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                You have {pendingInvitationCount} pending group invite
                {pendingInvitationCount > 1 ? "s" : ""}
              </h2>

              <p className="mt-2 text-sm text-slate-300">
                {firstInvitation?.group?.name
                  ? `You were invited to join "${firstInvitation.group.name}".`
                  : "Open your groups page to accept or decline your invite."}
              </p>
            </div>

            <Link
              to="/groups"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white sm:w-auto"
            >
              View invite <ChevronRight size={18} />
            </Link>
          </div>
        </section>
      ) : null}

      <LiveMatchFocusSection
        liveMatches={liveMatches}
        predictionByMatch={predictionByMatch}
        isAuthenticated={isAuthenticated}
        busyMatchId={busyMatchId}
        onPredict={handlePredict}
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Missing predictions"
          value={missingPredictions.length}
          tone={missingPredictions.length ? "action" : "default"}
        />
        <DashboardStatCard label="Total points" value={totalPoints ?? 0} />
        <DashboardStatCard label="Correct picks" value={correctPredictions} />
        <DashboardStatCard label="Exact scores" value={exactScores} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <DashboardPanel
            title="Next prediction needed"
            actionLabel="Open matches"
            actionTo="/matches"
          >
            {nextPredictionNeeded ? (
              <NextPredictionCard match={nextPredictionNeeded} />
            ) : (
              <EmptyDashboardMessage
                title="No missing upcoming predictions"
                description="You are caught up for the currently scheduled upcoming matches."
              />
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Upcoming matches"
            actionLabel="View all"
            actionTo="/matches"
          >
            <div className="space-y-3">
              {upcomingMatches.slice(0, 5).map((match) => {
                const prediction = predictionByMatch.get(match.id);

                return (
                  <article
                    key={match.id}
                    className="rounded-lg border border-white/10 bg-slate-950/64 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                          {match.stage}
                        </p>

                        <h3 className="mt-2 text-lg font-black text-white">
                          {match.team_a} vs {match.team_b}
                        </h3>

                        <p className="mt-1 text-sm text-slate-400">
                          {prediction
                            ? `Your pick: ${formatPredictionSummary(
                                match,
                                prediction,
                              )}`
                            : "No prediction yet"}
                        </p>
                      </div>

                      <p className="text-sm text-slate-300">
                        {formatDateTime(match.match_date)}
                      </p>
                    </div>
                  </article>
                );
              })}

              {!upcomingMatches.length ? (
                <EmptyDashboardMessage
                  title="No upcoming matches"
                  description="No scheduled upcoming match is available yet."
                />
              ) : null}
            </div>
          </DashboardPanel>
        </div>

        <div className="space-y-6">
          <DashboardPanel title="Next kickoff">
            {nextMatch && remaining ? (
              <NextKickoffCard match={nextMatch} remaining={remaining} />
            ) : (
              <EmptyDashboardMessage
                title="No next match"
                description="No upcoming kickoff is available."
              />
            )}
          </DashboardPanel>

          <DashboardPanel
            title="Champion pick"
            actionLabel={
              championPrediction ? "View predictions" : "Pick champion"
            }
            actionTo={championPrediction ? "/my-predictions" : "/champion-pick"}
          >
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-slate-400">Your champion</p>
              <p className="mt-2 text-2xl font-black text-gold-300">
                {championPrediction?.predicted_team ?? "Not selected"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {championPrediction
                  ? "Champion prediction submitted. Worth 3 points if correct."
                  : "Choose your champion. This pick is worth 3 points."}
              </p>
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Top three"
            actionLabel="Full table"
            actionTo="/scoreboard"
          >
            {leaders.length ? (
              <TopThreePodium users={leaders} />
            ) : (
              <EmptyDashboardMessage
                title="No rankings yet"
                description="The podium opens when players start scoring points."
              />
            )}
          </DashboardPanel>
        </div>
      </section>
    </main>
  );
}

function PublicHome({
  leaders,
  upcomingMatches,
  liveMatches,
  nextMatch,
  remaining,
}) {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-pitch-lines bg-[length:48px_48px] opacity-25" />
        <div className="absolute left-1/2 top-16 h-64 w-[86vw] -translate-x-1/2 rounded-full bg-emerald-300/15 blur-3xl" />

        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
          <div className="min-w-0">
            <p className="inline-flex max-w-full rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200 sm:text-sm sm:tracking-[0.28em]">
              Original tournament prediction app
            </p>

            <h1 className="mt-6 max-w-[21rem] text-4xl font-black leading-tight sm:max-w-4xl sm:text-7xl">
              <span className="block sm:inline">Predict the </span>
              <span className="block sm:inline">World Cup 2026 </span>
              <span className="block sm:inline">Champion</span>
            </h1>

            <p className="mt-6 max-w-[21rem] text-base leading-8 text-slate-300 sm:max-w-2xl sm:text-lg">
              Create an account, predict every scheduled match, earn points for
              correct calls, and rise through the ranking table.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-glow transition hover:bg-white"
                to="/register"
              >
                Create account <ChevronRight size={18} />
              </Link>

              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950"
                to="/scoreboard"
              >
                View scoreboard <Trophy size={18} />
              </Link>
            </div>
          </div>

          <NextKickoffAside nextMatch={nextMatch} remaining={remaining} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <LiveMatchFocusSection
          liveMatches={liveMatches}
          predictionByMatch={new Map()}
          isAuthenticated={false}
          busyMatchId={null}
          onPredict={() => undefined}
        />

        <div className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <Icon size={24} className="text-emerald-300" />
                <h3 className="mt-4 text-lg font-black text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Upcoming matches</h2>

              <Link
                to="/matches"
                className="text-sm font-bold text-emerald-300 hover:text-white"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingMatches.slice(0, 4).map((match) => (
                <article
                  key={match.id}
                  className="rounded-lg border border-white/10 bg-slate-950/64 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                        {match.stage}
                      </p>

                      <h3 className="mt-2 text-lg font-black text-white">
                        {match.team_a} vs {match.team_b}
                      </h3>
                    </div>

                    <p className="text-sm text-slate-300">
                      {formatDateTime(match.match_date)}
                    </p>
                  </div>
                </article>
              ))}

              {!upcomingMatches.length ? (
                <EmptyDashboardMessage
                  title="No upcoming matches"
                  description="No scheduled upcoming match is available yet."
                />
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Top three</h2>

              <Link
                to="/scoreboard"
                className="text-sm font-bold text-emerald-300 hover:text-white"
              >
                Full table
              </Link>
            </div>

            {leaders.length ? (
              <TopThreePodium users={leaders} />
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-slate-300">
                The podium opens when players start scoring points.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function LiveMatchFocusSection({
  liveMatches,
  predictionByMatch,
  isAuthenticated,
  busyMatchId,
  onPredict,
}) {
  if (!liveMatches.length) return null;

  const hasMultipleLiveMatches = liveMatches.length > 1;

  return (
    <section className="mt-8 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-5 shadow-2xl sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            Live now
          </p>

          <h2 className="mt-2 text-3xl font-black text-white">
            Current live match
          </h2>

          <p className="mt-2 text-sm text-slate-300">
            Follow the live score and match status here.
          </p>
        </div>

        <Link
          to="/matches"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white sm:w-auto"
        >
          Open matches <ChevronRight size={18} />
        </Link>
      </div>

      <div className="mt-6 flex justify-center">
        <div
          className={
            hasMultipleLiveMatches
              ? "grid w-full max-w-6xl gap-5 lg:grid-cols-2"
              : "w-full max-w-3xl"
          }
        >
          {liveMatches.map((match) => (
            <div
              key={match.id}
              className="rounded-lg ring-2 ring-emerald-300/60 ring-offset-4 ring-offset-slate-950"
            >
              <MatchCard
                match={match}
                prediction={predictionByMatch.get(match.id)}
                isAuthenticated={isAuthenticated}
                busy={busyMatchId === match.id}
                onPredict={onPredict}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPanel({ title, actionLabel, actionTo, children }) {
  return (
    <section className="rounded-lg border border-white/10 bg-slate-950/72 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>

        {actionLabel && actionTo ? (
          <Link
            to={actionTo}
            className="text-sm font-bold text-emerald-300 hover:text-white"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function DashboardStatCard({ label, value, tone = "default" }) {
  return (
    <article
      className={`rounded-lg border p-4 ${
        tone === "action"
          ? "border-emerald-300/30 bg-emerald-300/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-white sm:text-3xl">{value}</p>
    </article>
  );
}

function NextPredictionCard({ match }) {
  return (
    <article className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
        Action needed
      </p>

      <h3 className="mt-2 text-xl font-black text-white">
        {match.team_a} vs {match.team_b}
      </h3>

      <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
        <CalendarDays size={16} className="text-emerald-300" />
        {formatDateTime(match.match_date)}
      </p>

      <Link
        to={`/matches?match=${match.id}`}
        className="mt-4 inline-flex rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-white"
      >
        Predict now
      </Link>
    </article>
  );
}

function NextKickoffAside({ nextMatch, remaining }) {
  return (
    <aside className="rounded-lg border border-white/10 bg-slate-950/76 p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-gold-300">
          Next kickoff
        </p>
        <Sparkles size={18} className="text-gold-300" />
      </div>

      {nextMatch && remaining ? (
        <NextKickoffContent match={nextMatch} remaining={remaining} />
      ) : (
        <p className="mt-4 text-slate-300">No upcoming match is available.</p>
      )}
    </aside>
  );
}

function NextKickoffCard({ match, remaining }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <NextKickoffContent match={match} remaining={remaining} />
    </div>
  );
}

function NextKickoffContent({ match, remaining }) {
  return (
    <>
      <h2 className="mt-4 text-2xl font-black">
        {match.team_a} vs {match.team_b}
      </h2>

      <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
        <CalendarDays size={16} className="text-emerald-300" />
        {formatDateTime(match.match_date)}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ClockUnit label="Days" value={remaining.days} />
        <ClockUnit label="Hours" value={remaining.hours} />
        <ClockUnit label="Mins" value={remaining.minutes} />
        <ClockUnit label="Secs" value={remaining.seconds} />
      </div>
    </>
  );
}

function EmptyDashboardMessage({ title, description }) {
  return (
    <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function ClockUnit({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3 text-center">
      <p className="text-2xl font-black text-white">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function formatPredictionSummary(match, prediction) {
  const resultLabel =
    prediction.predicted_result === "team_a"
      ? match.team_a
      : prediction.predicted_result === "team_b"
        ? match.team_b
        : "Draw";

  const hasScore =
    prediction.predicted_home_score !== null &&
    prediction.predicted_home_score !== undefined &&
    prediction.predicted_away_score !== null &&
    prediction.predicted_away_score !== undefined;

  if (!hasScore) {
    return resultLabel;
  }

  return `${resultLabel}, ${prediction.predicted_home_score}-${prediction.predicted_away_score}`;
}
