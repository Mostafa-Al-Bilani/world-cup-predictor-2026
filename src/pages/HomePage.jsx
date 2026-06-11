import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { TopThreePodium } from "../components/TopThreePodium";
import { useAuth } from "../context/AuthContext";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";
import { profileService } from "../services/profileService";
import { formatDateTime, getTimeRemaining } from "../utils/date";
import { getAccuracy, getPredictionTotalPoints } from "../utils/predictions";

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

export function HomePage() {
  const { user, profile, championPrediction, isAuthenticated } = useAuth();

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    async function load() {
      const [matchRows, leaderRows, predictionRows] = await Promise.all([
        matchService.getMatches(),
        profileService.getLeaderboard(),
        predictionService.getPredictionsForUser(user?.id),
      ]);

      setMatches(matchRows);
      setLeaders(leaderRows);
      setPredictions(predictionRows);
    }

    load().catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter(
          (match) =>
            match.status === "upcoming" &&
            new Date(match.match_date).getTime() > tick,
        )
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date)),
    [matches, tick],
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

  if (isAuthenticated) {
    return (
      <DashboardHome
        profile={profile}
        championPrediction={championPrediction}
        leaders={leaders}
        predictions={predictions}
        upcomingMatches={upcomingMatches}
        missingPredictions={missingPredictions}
        nextMatch={nextMatch}
        nextPredictionNeeded={nextPredictionNeeded}
        remaining={remaining}
        predictionByMatch={predictionByMatch}
      />
    );
  }

  return (
    <PublicHome
      leaders={leaders}
      upcomingMatches={upcomingMatches}
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
  nextMatch,
  nextPredictionNeeded,
  remaining,
  predictionByMatch,
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            Your dashboard
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Welcome back
            {profile?.username || profile?.display_name
              ? `, ${profile.username ?? profile.display_name}`
              : ""}
            .
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            You are signed in. Track your score, finish missing predictions, and
            follow the next World Cup match from one place.
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

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Total points" value={totalPoints ?? 0} />
        <DashboardStatCard label="Correct picks" value={correctPredictions} />
        <DashboardStatCard label="Exact scores" value={exactScores} />
        <DashboardStatCard label="Accuracy" value={`${accuracy}%`} />
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
                            ? `Your pick: ${formatPredictionSummary(match, prediction)}`
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
                  ? "Locked for the tournament."
                  : "Choose your champion before continuing."}
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

function PublicHome({ leaders, upcomingMatches, nextMatch, remaining }) {
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

function DashboardStatCard({ label, value }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
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
        to="/matches"
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
