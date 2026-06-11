import { Crown, Medal, Trophy } from "lucide-react";
import { getTopThreeUsers } from "../utils/leaderboard";
import { getAccuracy } from "../utils/predictions";

const podiumStyles = [
  "xl:order-2 xl:-translate-y-5 border-gold-300/50 bg-gold-300/15",
  "xl:order-1 border-slate-300/40 bg-slate-300/10",
  "xl:order-3 border-amber-700/50 bg-amber-700/15",
];

export function TopThreePodium({ users }) {
  const topThree = getTopThreeUsers(users);

  if (!topThree.length) return null;

  return (
    <section
      className="grid gap-4 xl:grid-cols-3 xl:items-end"
      aria-label="Top three players"
    >
      {topThree.map((user, index) => (
        <article
          key={user.id}
          className={`min-w-0 rounded-lg border p-5 text-center shadow-xl ${podiumStyles[index]}`}
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-950/80 text-gold-300">
            {index === 0 ? (
              <Crown size={28} />
            ) : index === 1 ? (
              <Trophy size={26} />
            ) : (
              <Medal size={26} />
            )}
          </div>

          <p className="mt-4 text-sm font-black uppercase tracking-[0.24em] text-slate-300">
            Rank #{index + 1}
          </p>

          <h3 className="mt-2 truncate text-2xl font-black text-white">
            {user.username}
          </h3>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Metric label="Total" value={user.total_points ?? 0} />
            <Metric
              label="Match"
              value={
                (user.match_winner_points ?? 0) +
                (user.exact_score_points ?? 0)
              }
            />
            <Metric label="Champion" value={user.champion_points ?? 0} />
            <Metric label="Bracket" value={user.bracket_points ?? 0} />
            <Metric
              label="Accuracy"
              value={`${getAccuracy(user)}%`}
              className="col-span-2"
            />
          </div>
        </article>
      ))}
    </section>
  );
}

function Metric({ label, value, className = "" }) {
  return (
    <div
      className={`min-w-0 rounded-lg bg-black/25 px-3 py-3 text-center ${className}`}
    >
      <p className="truncate text-xl font-black text-white">{value}</p>
      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}