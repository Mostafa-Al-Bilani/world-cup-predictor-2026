import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Medal, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import { TopThreePodium } from '../components/TopThreePodium';
import { matchService } from '../services/matchService';
import { profileService } from '../services/profileService';
import { formatDateTime, getTimeRemaining } from '../utils/date';

const features = [
  {
    title: 'Predict matches',
    description: 'Pick the result or final winner and add an optional exact score before kickoff.',
    icon: ShieldCheck,
  },
  {
    title: 'Earn points',
    description: 'Every correct result earns one clean point.',
    icon: Medal,
  },
  {
    title: 'Climb the scoreboard',
    description: 'Rank by points, correct calls, or accuracy.',
    icon: Trophy,
  },
  {
    title: 'Compete with friends',
    description: 'Public rankings make every group-stage call matter.',
    icon: Users,
  },
];

export function HomePage() {
  const [matches, setMatches] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    async function load() {
      const [matchRows, leaderRows] = await Promise.all([
        matchService.getMatches(),
        profileService.getLeaderboard(),
      ]);
      setMatches(matchRows);
      setLeaders(leaderRows);
    }
    load().catch(() => undefined);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const upcomingMatches = useMemo(
    () => matches.filter((match) => match.status === 'upcoming' && new Date(match.match_date).getTime() > tick),
    [matches, tick],
  );
  const nextMatch = upcomingMatches[0];
  const remaining = nextMatch ? getTimeRemaining(nextMatch.match_date) : null;

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
              Create an account, predict every scheduled match, earn points for correct calls, and rise through a public ranking table built for tournament drama.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-glow transition hover:bg-white"
                to="/matches"
              >
                Start Predicting <ChevronRight size={18} />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950"
                to="/scoreboard"
              >
                View Scoreboard <Trophy size={18} />
              </Link>
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-slate-950/76 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-gold-300">Next kickoff</p>
              <Sparkles size={18} className="text-gold-300" />
            </div>
            {nextMatch && remaining ? (
              <>
                <h2 className="mt-4 text-2xl font-black">
                  {nextMatch.team_a} vs {nextMatch.team_b}
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <CalendarDays size={16} className="text-emerald-300" />
                  {formatDateTime(nextMatch.match_date)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ClockUnit label="Days" value={remaining.days} />
                  <ClockUnit label="Hours" value={remaining.hours} />
                  <ClockUnit label="Mins" value={remaining.minutes} />
                  <ClockUnit label="Secs" value={remaining.seconds} />
                </div>
              </>
            ) : (
              <p className="mt-4 text-slate-300">No upcoming match is available.</p>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <Icon size={24} className="text-emerald-300" />
                <h3 className="mt-4 text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
              </article>
            );
          })}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Upcoming Matches</h2>
              <Link to="/matches" className="text-sm font-bold text-emerald-300 hover:text-white">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingMatches.slice(0, 4).map((match) => (
                <article key={match.id} className="rounded-lg border border-white/10 bg-slate-950/64 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{match.stage}</p>
                      <h3 className="mt-2 text-lg font-black text-white">
                        {match.team_a} vs {match.team_b}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-300">{formatDateTime(match.match_date)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">Top Three</h2>
              <Link to="/scoreboard" className="text-sm font-bold text-emerald-300 hover:text-white">
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

function ClockUnit({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3 text-center">
      <p className="text-2xl font-black text-white">{String(value).padStart(2, '0')}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
