import clsx from "clsx";
import { Link } from "react-router-dom";
import { getCanonicalTeam, isRealTeam } from "../../utils/teamIdentity.js";

export function TeamLink({
  team,
  children,
  className,
  onClick,
  stopPropagation = false,
}) {
  const canonical = getCanonicalTeam(team);

  if (!canonical || !isRealTeam(team)) {
    return <span className={className}>{children ?? team}</span>;
  }

  const handleClick = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }

    onClick?.(event);
  };

  return (
    <Link
      to={`/teams/${canonical.slug}`}
      aria-label={`View ${canonical.name} team page`}
      className={clsx(
        "rounded-sm text-inherit transition hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300",
        className,
      )}
      onClick={handleClick}
    >
      {children ?? canonical.name}
    </Link>
  );
}

export function TeamVsLabel({ teamA, teamB, className }) {
  return (
    <span className={className}>
      <TeamLink team={teamA}>{teamA}</TeamLink>
      <span className="text-slate-400"> vs </span>
      <TeamLink team={teamB}>{teamB}</TeamLink>
    </span>
  );
}
