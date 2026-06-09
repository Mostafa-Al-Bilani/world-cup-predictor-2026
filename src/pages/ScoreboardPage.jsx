import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ScoreboardTable } from '../components/ScoreboardTable';
import { TopThreePodium } from '../components/TopThreePodium';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { getAccuracy } from '../utils/predictions';

export function ScoreboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_points');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setPlayers(await profileService.getLeaderboard());
      } catch (error) {
        toast.error(error.message ?? 'Could not load scoreboard.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rankedPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players
      .filter((player) => !query || player.username.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortBy === 'accuracy') return getAccuracy(b) - getAccuracy(a);
        return (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
      });
  }, [players, search, sortBy]);

  if (loading) return <LoadingSpinner label="Loading scoreboard" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Public rankings</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Scoreboard</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Every correct guess earns one point. The table updates from profile totals recalculated from predictions.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-300"
            placeholder="Search username"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-300"
          >
            <option value="total_points">Total points</option>
            <option value="correct_predictions">Correct predictions</option>
            <option value="accuracy">Accuracy percentage</option>
          </select>
        </div>
      </div>

      {rankedPlayers.length ? (
        <>
          <div className="mt-10">
            <TopThreePodium users={rankedPlayers} />
          </div>
          <div className="mt-8">
            <ScoreboardTable users={rankedPlayers} currentUserId={user?.id} />
          </div>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No points on the board yet"
            description="Once finished matches are scored, ranked players will appear here with their prediction accuracy."
          />
        </div>
      )}
    </main>
  );
}
