import { Menu, ShieldCheck, Trophy, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { MATCHES_UPDATED_EVENT } from "../hooks/useLiveMatchNotifications";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";

const baseNavItems = [
  { to: "/", label: "Home" },
  { to: "/matches", label: "Matches", badgeKey: "missingPredictions" },
  { to: "/scoreboard", label: "Scoreboard" },
  { to: "/my-predictions", label: "My Predictions" },
];

const authenticatedExtraNavItems = [
  { to: "/bracket", label: "Bracket" },
  { to: "/groups", label: "Groups" },
];

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

function getMissingPredictionCount({ matches, predictions }) {
  const predictedMatchIds = new Set(
    predictions.map((prediction) => prediction.match_id),
  );

  return matches.filter((match) => {
    const isUpcoming = normalizeStatus(match.status) === "upcoming";
    const isFutureMatch = new Date(match.match_date).getTime() > Date.now();

    return isUpcoming && isFutureMatch && !predictedMatchIds.has(match.id);
  }).length;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [missingPredictionCount, setMissingPredictionCount] = useState(0);

  const { user, isAuthenticated, isAdmin, profile, signOut } = useAuth();

  const username = profile?.username ?? user?.email?.split("@")[0] ?? "Player";

  const visibleNavItems = useMemo(
    () =>
      isAuthenticated
        ? [...baseNavItems, ...authenticatedExtraNavItems]
        : baseNavItems,
    [isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setMissingPredictionCount(0);
      return undefined;
    }

    let cancelled = false;

    const loadMissingPredictionCount = async (overrideMatches = null) => {
      try {
        const [matchRows, predictionRows] = await Promise.all([
          overrideMatches
            ? Promise.resolve(overrideMatches)
            : matchService.getMatches(),
          predictionService.getPredictionsForUser(user.id),
        ]);

        if (cancelled) return;

        setMissingPredictionCount(
          getMissingPredictionCount({
            matches: matchRows,
            predictions: predictionRows,
          }),
        );
      } catch {
        if (!cancelled) {
          setMissingPredictionCount(0);
        }
      }
    };

    loadMissingPredictionCount();

    const handleMatchesUpdated = (event) => {
      if (Array.isArray(event.detail?.matches)) {
        loadMissingPredictionCount(event.detail.matches);
      }
    };

    window.addEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);
    };
  }, [isAuthenticated, user?.id]);

  const linkClass = ({ isActive }) =>
    clsx(
      "rounded-full px-3 py-2 text-sm font-semibold transition",
      isActive
        ? "bg-white text-slate-950"
        : "text-slate-200 hover:bg-white/10 hover:text-white",
    );

  const authLinkState = { scrollToAuth: true };

  const renderNavLabel = (item) => {
    const badgeValue =
      item.badgeKey === "missingPredictions" ? missingPredictionCount : 0;

    return (
      <span className="inline-flex items-center gap-2">
        <span>{item.label}</span>

        {badgeValue > 0 ? (
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-black leading-none text-emerald-950"
            title={`${badgeValue} upcoming matches need predictions`}
          >
            {badgeValue > 99 ? "99+" : badgeValue}
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/82 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gold-300/40 bg-gold-300/15 text-gold-300 shadow-gold">
            <Trophy size={20} />
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-black uppercase tracking-[0.22em] text-white">
              CupPredict
            </span>
            <span className="block truncate text-xs text-emerald-200">
              2026 Tournament League
            </span>
          </span>
        </Link>

        {isAuthenticated ? (
          <div className="flex max-w-[128px] shrink-0 items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 lg:hidden">
            <UserRound size={15} className="shrink-0 text-emerald-300" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-black text-white">
                {username}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                Signed in
              </span>
            </span>
          </div>
        ) : null}

        <div className="hidden items-center gap-1 lg:flex">
          {visibleNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {renderNavLabel(item)}
            </NavLink>
          ))}

          {isAdmin ? (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          ) : null}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <span className="max-w-40 truncate rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">
                {username}
              </span>

              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white hover:text-slate-950"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                className="rounded-full px-4 py-2 text-sm font-bold text-slate-200 hover:text-white"
                to="/login"
                state={authLinkState}
              >
                Log in
              </Link>

              <Link
                className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 shadow-glow transition hover:bg-white"
                to="/register"
                state={authLinkState}
              >
                Register
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/5 text-white lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-4 lg:hidden">
          {isAuthenticated ? (
            <div className="mb-3 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                Signed in as
              </p>
              <p className="mt-1 truncate text-lg font-black text-white">
                {username}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {renderNavLabel(item)}
              </NavLink>
            ))}

            {isAdmin ? (
              <NavLink
                to="/admin"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} /> Admin
                </span>
              </NavLink>
            ) : null}

            <div className="mt-3 border-t border-white/10 pt-3">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    setOpen(false);
                  }}
                  className="w-full rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white"
                >
                  Log out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="rounded-full border border-white/15 px-4 py-2 text-center text-sm font-bold"
                    to="/login"
                    state={authLinkState}
                    onClick={() => setOpen(false)}
                  >
                    Log in
                  </Link>

                  <Link
                    className="rounded-full bg-emerald-300 px-4 py-2 text-center text-sm font-black text-emerald-950"
                    to="/register"
                    state={authLinkState}
                    onClick={() => setOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}