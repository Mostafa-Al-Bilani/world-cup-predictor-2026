import clsx from "clsx";
import { Crown, Medal, Trophy } from "lucide-react";
import { getTopThreeUsers } from "../utils/leaderboard";
import { getAccuracy } from "../utils/predictions";

const podiumStyles = [
  {
    card: "border-gold-300/50 bg-gold-300/15 lg:-translate-y-2",
    icon: "text-gold-300",
    rank: "text-gold-300",
  },
  {
    card: "border-slate-300/40 bg-slate-300/10",
    icon: "text-slate-300",
    rank: "text-slate-300",
  },
  {
    card: "border-amber-700/50 bg-amber-700/15",
    icon: "text-amber-600",
    rank: "text-amber-600",
  },
];

const rankIcons = [Crown, Trophy, Medal];

const layoutByCount = {
  1: "mx-auto max-w-sm grid-cols-1",
  2: "mx-auto max-w-2xl grid-cols-1 sm:grid-cols-2",
  3: [
    "grid-cols-1",
    "sm:grid-cols-2",
    "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end",
  ].join(" "),
};

const cardLayoutByCount = {
  1: [""],
  2: ["", ""],
  3: ["sm:col-span-2 lg:col-span-1 lg:order-2", "lg:order-1", "lg:order-3"],
};

export function TopThreePodium({ users }) {
  const topThree = getTopThreeUsers(users);

  if (!topThree.length) return null;

  const count = topThree.length;

  return (
    <section
      className={clsx("grid gap-4", layoutByCount[count])}
      aria-label="Top three players"
    >
      {topThree.map((user, index) => (
        <PodiumCard
          key={user.id}
          user={user}
          rank={index + 1}
          index={index}
          layoutClass={cardLayoutByCount[count][index] ?? ""}
          emphasized={index === 0}
        />
      ))}
    </section>
  );
}

function PodiumCard({ user, rank, index, layoutClass, emphasized }) {
  const style = podiumStyles[index];
  const RankIcon = rankIcons[index];

  const primaryStats = [
    { label: "Points", value: user.total_points ?? 0 },
    { label: "Correct", value: user.correct_predictions ?? 0 },
    { label: "Exact", value: user.exact_score_points ?? 0 },
  ];

  const secondaryStats = [
    { label: "Winner", value: user.match_winner_points ?? 0 },
    { label: "Champion", value: user.champion_points ?? 0 },
    { label: "Bracket", value: user.bracket_points ?? 0 },
    { label: "Accuracy", value: `${getAccuracy(user)}%` },
  ];

  return (
    <article
      className={clsx(
        "flex min-w-0 flex-col rounded-lg border p-4 shadow-xl sm:p-5",
        style.card,
        layoutClass,
      )}
    >
      <header className="flex min-w-0 items-start gap-3">
        <div
          className={clsx(
            "grid shrink-0 place-items-center rounded-lg bg-slate-950/80",
            emphasized ? "h-12 w-12 sm:h-14 sm:w-14" : "h-11 w-11 sm:h-12 sm:w-12",
          )}
        >
          <RankIcon
            size={emphasized ? 26 : 22}
            className={style.icon}
            aria-hidden="true"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={clsx(
              "text-xs font-black uppercase tracking-[0.2em]",
              style.rank,
            )}
          >
            Rank #{rank}
          </p>

          <h3
            className={clsx(
              "mt-1 truncate font-black text-white",
              emphasized ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
            )}
            title={user.username}
          >
            {user.username}
          </h3>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-3 gap-x-2 gap-y-1 border-t border-white/10 pt-4">
        {primaryStats.map(({ label, value }) => (
          <div key={label} className="min-w-0 text-center">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {label}
            </dt>
            <dd className="mt-0.5 text-base font-black tabular-nums text-white sm:text-lg">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4">
        {secondaryStats.map(({ label, value }) => (
          <div key={label} className="min-w-0 text-center">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-slate-300">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
