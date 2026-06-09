import { Menu, ShieldCheck, Trophy, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/matches', label: 'Matches' },
  { to: '/scoreboard', label: 'Scoreboard' },
  { to: '/my-predictions', label: 'My Predictions' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();
  const visibleNavItems = isAuthenticated ? [...navItems, { to: '/groups', label: 'Groups' }] : navItems;

  const linkClass = ({ isActive }) =>
    clsx(
      'rounded-full px-3 py-2 text-sm font-semibold transition',
      isActive ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white',
    );

  const authLinkState = { scrollToAuth: true };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/82 backdrop-blur-xl">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between py-4 pl-4 pr-8 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-gold-300/40 bg-gold-300/15 text-gold-300 shadow-gold">
            <Trophy size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black uppercase tracking-[0.22em] text-white">
              CupPredict
            </span>
            <span className="block text-xs text-emerald-200">2026 Tournament League</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {visibleNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
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
                {profile?.username ?? 'Player'}
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
          className="ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/5 text-white lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {visibleNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            {isAdmin ? (
              <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
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
