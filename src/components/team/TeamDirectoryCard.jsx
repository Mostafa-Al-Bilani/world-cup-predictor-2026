import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { TeamFlag } from "../TeamFlag.jsx";
import {
  formatCompactRecord,
  formatExpandedRecord,
} from "../../utils/teamDirectoryLive.js";

export function TeamDirectoryCard({
  team,
  liveSummary,
  isAuthenticated,
}) {
  const record = formatCompactRecord(team.stats);

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-white/15 bg-slate-950/80 p-5 shadow-lg transition hover:-translate-y-0.5 hover:border-emerald-300/45 hover:shadow-[0_12px_32px_rgba(15,23,42,0.45)] focus-within:border-emerald-300/45">
      <div className="flex min-w-0 items-start gap-3">
        <TeamFlag teamName={team.name} size="md" variant="premium" />

        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-black leading-snug text-white">
            {team.name}
          </h2>

          {team.group ? (
            <span className="mt-1.5 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
              {team.group}
            </span>
          ) : null}
        </div>
      </div>

      {liveSummary ? (
        <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
          <span className="inline-flex items-center gap-1.5 uppercase tracking-[0.16em]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-200 motion-safe:animate-pulse motion-reduce:animate-none"
              aria-hidden="true"
            />
            Live
          </span>
          <span className="text-white">
            {team.name} {liveSummary.scoreLabel} {liveSummary.opponent}
          </span>
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
        <div className="min-w-0">
          <dt className="font-bold uppercase tracking-[0.12em] text-slate-500">
            Played
          </dt>
          <dd className="mt-1 text-lg font-black text-white">{team.stats.played}</dd>
        </div>

        <div className="min-w-0">
          <dt className="font-bold uppercase tracking-[0.12em] text-slate-500">
            Record
          </dt>
          <dd
            className="mt-1 text-sm font-black leading-5 text-white"
            title={formatExpandedRecord(team.stats)}
          >
            {record}
          </dd>
        </div>

        <div className="min-w-0 text-right">
          <dt className="font-bold uppercase tracking-[0.12em] text-slate-500">
            Goals
          </dt>
          <dd className="mt-1 text-lg font-black text-white">
            {team.stats.goalsFor}–{team.stats.goalsAgainst}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Your prediction impact
        </p>
        {isAuthenticated ? (
          <p className="mt-1 text-sm text-slate-300">
            <span className="font-black text-gold-300">{team.pointsEarned}</span>{" "}
            points earned
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-400">
            Sign in to view prediction impact
          </p>
        )}
      </div>

      <Link
        to={`/teams/${team.slug}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-300/35 px-4 py-2.5 text-sm font-black text-emerald-100 transition group-hover:bg-emerald-300 group-hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
      >
        View team
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
