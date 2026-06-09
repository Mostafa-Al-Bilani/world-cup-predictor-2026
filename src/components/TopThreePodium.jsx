import { Crown, Medal, Trophy } from 'lucide-react';
import { getAccuracy } from '../utils/predictions';
import { getTopThreeUsers } from '../utils/leaderboard';

const podiumStyles = [
  'md:order-2 md:-translate-y-6 border-gold-300/50 bg-gold-300/15',
  'md:order-1 border-slate-300/40 bg-slate-300/10',
  'md:order-3 border-amber-700/50 bg-amber-700/15',
];

export function TopThreePodium({ users }) {
  const topThree = getTopThreeUsers(users);

  if (!topThree.length) return null;

  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-center" aria-label="Top three players">
      {topThree.map((user, index) => (
        <article
          key={user.id}
          className={`w-full rounded-lg border p-5 text-center shadow-xl md:max-w-sm md:flex-1 ${podiumStyles[index]}`}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-950/80 text-gold-300">
            {index === 0 ? <Crown size={28} /> : index === 1 ? <Trophy size={26} /> : <Medal size={26} />}
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-slate-300">Rank #{index + 1}</p>
          <h3 className="mt-2 truncate text-2xl font-black text-white">{user.username}</h3>
          <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            <Metric label="Points" value={user.total_points} />
            <Metric label="Match" value={(user.match_winner_points ?? 0) + (user.exact_score_points ?? 0)} />
            <Metric label="Champion" value={user.champion_points ?? 0} />
            <Metric label="Accuracy" value={`${getAccuracy(user)}%`} />
          </div>
        </article>
      ))}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-black/25 p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
