import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, CalendarCheck, CalendarClock, Goal, RefreshCw, Users } from 'lucide-react';
import { AdminMatchForm } from '../components/AdminMatchForm';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { fixtureSyncService } from '../services/fixtureSyncService';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import { profileService } from '../services/profileService';
import { formatDateTime } from '../utils/date';

export function AdminDashboardPage() {
  const { isSupabaseConfigured } = useAuth();
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [matchRows, statRows] = await Promise.all([matchService.getMatches(), profileService.getAdminStats()]);
      setMatches(matchRows);
      setStats(statRows);
    } catch (error) {
      toast.error(error.message ?? 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visibleMatches = useMemo(() => matches.slice(0, 36), [matches]);

  const saveMatch = async (payload) => {
    setSaving(true);
    try {
      const saved = await matchService.saveMatch(payload);
      if (saved.status === 'finished' && saved.result) {
        await predictionService.recalculateMatch(saved.id);
      }
      toast.success(saved.status === 'finished' ? 'Match saved and points recalculated.' : 'Match saved.');
      setSelectedMatch(null);
      await load();
    } catch (error) {
      toast.error(error.message ?? 'Could not save match.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMatch = async () => {
    try {
      await matchService.deleteMatch(deleteTarget.id);
      toast.success('Match deleted.');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error.message ?? 'Could not delete match.');
    }
  };

  const recalculate = async (match) => {
    try {
      await predictionService.recalculateMatch(match.id);
      toast.success('Points recalculated from predictions.');
      await load();
    } catch (error) {
      toast.error(error.message ?? 'Could not recalculate points.');
    }
  };

  const syncFixtures = async () => {
    setSyncing(true);
    setSyncSummary(null);
    try {
      const summary = await fixtureSyncService.syncOpenFootballFixtures();
      setSyncSummary(summary);
      toast.success(`Fixture sync complete: ${summary.inserted} inserted, ${summary.updated} updated.`);
      await load();
    } catch (error) {
      toast.error(error.message ?? 'Could not sync fixtures.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading admin controls" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Protected operations</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Admin Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Manage fixtures, finish matches, enter results, sync openfootball fixtures, and recalculate scores.
          </p>
        </div>
        <button
          type="button"
          onClick={syncFixtures}
          disabled={syncing || !isSupabaseConfigured}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/40 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />
          {syncing ? 'Syncing fixtures...' : 'Sync Fixtures'}
        </button>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-lg border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
          Fixture sync is disabled in local demo mode. Configure Supabase locally to import openfootball data into the
          database.
        </div>
      ) : null}

      {syncSummary ? (
        <div className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
          Synced {syncSummary.total} fixtures from openfootball: {syncSummary.inserted} inserted, {syncSummary.updated}{' '}
          updated, {syncSummary.unchanged} unchanged.
        </div>
      ) : null}

      {stats ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Users" value={stats.totalUsers} />
          <StatCard icon={CalendarCheck} label="Matches" value={stats.totalMatches} />
          <StatCard icon={Goal} label="Predictions" value={stats.totalPredictions} />
          <StatCard icon={Activity} label="Finished" value={stats.finishedMatches} />
          <StatCard icon={CalendarClock} label="Upcoming" value={stats.upcomingMatches} />
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
        <AdminMatchForm
          match={selectedMatch}
          onSubmit={saveMatch}
          onCancel={() => setSelectedMatch(null)}
          saving={saving}
        />

        <div className="rounded-lg border border-white/10 bg-slate-950/72">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-2xl font-black">Match management</h2>
            <p className="mt-2 text-sm text-slate-400">Showing the next 36 rows for faster admin scanning.</p>
          </div>
          <div className="max-h-[720px] divide-y divide-white/10 overflow-auto">
            {visibleMatches.map((match) => (
              <article key={match.id} className="p-5 transition hover:bg-white/[0.03]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={match.status} />
                      <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{match.stage}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-white">
                      {match.team_a} vs {match.team_b}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatDateTime(match.match_date)} - {match.venue}, {match.city}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMatch(match)}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => recalculate(match)}
                      className="rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-300 hover:text-emerald-950"
                    >
                      Recalculate
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(match)}
                      className="rounded-full border border-rose-300/40 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-300 hover:text-rose-950"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {deleteTarget ? (
        <ConfirmationModal
          title="Delete match?"
          description={`This removes ${deleteTarget.team_a} vs ${deleteTarget.team_b}. Existing predictions tied to the match may also be affected by database constraints.`}
          confirmLabel="Delete match"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteMatch}
        />
      ) : null}
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <Icon size={22} className="text-emerald-300" />
      <p className="mt-4 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    </article>
  );
}
