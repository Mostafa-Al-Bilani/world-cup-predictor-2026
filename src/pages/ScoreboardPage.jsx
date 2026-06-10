import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ScoreboardTable } from '../components/ScoreboardTable';
import { TopThreePodium } from '../components/TopThreePodium';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/profileService';
import { syncLogService } from '../services/syncLogService';
import { formatDateTime } from '../utils/date';
import { getSafeErrorMessage } from '../utils/errors';
import { hasScoredLeaderboardEntries, sortLeaderboardUsers } from '../utils/leaderboard';
import { getAccuracy } from '../utils/predictions';

export function ScoreboardPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_points');
  const [latestSync, setLatestSync] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [leaderboard, syncLog] = await Promise.all([
          profileService.getLeaderboard(),
          syncLogService.getLatestSuccessfulSync().catch(() => null),
        ]);
        setPlayers(leaderboard);
        setLatestSync(syncLog);
      } catch (error) {
        toast.error(getSafeErrorMessage(error, 'Could not load scoreboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rankedPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortLeaderboardUsers(players)
      .filter((player) => !query || player.username.toLowerCase().includes(query))
      .sort((a, b) => {
        const primary = sortBy === 'accuracy' ? getAccuracy(b) - getAccuracy(a) : (b[sortBy] ?? 0) - (a[sortBy] ?? 0);
        if (primary !== 0) return primary;
        if ((b.total_points ?? 0) !== (a.total_points ?? 0)) return (b.total_points ?? 0) - (a.total_points ?? 0);
        if ((b.correct_predictions ?? 0) !== (a.correct_predictions ?? 0)) {
          return (b.correct_predictions ?? 0) - (a.correct_predictions ?? 0);
        }
        return a.username.localeCompare(b.username);
      });
  }, [players, search, sortBy]);
  const hasScoredRows = hasScoredLeaderboardEntries(rankedPlayers);

  if (loading) return <LoadingSpinner label="Loading scoreboard" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Public rankings</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Scoreboard</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Correct match winner picks earn one point, exact scores add one bonus point, and a correct World Cup champion
            pick adds three tournament points. Bracket predictions add stage advancement points after qualifiers are known.
          </p>
          {latestSync ? (
            <p className="mt-3 text-sm text-slate-400">
              Fixture data last updated {formatDateTime(latestSync.finished_at)} from {latestSync.provider}
              {latestSync.fallback_used ? ' fallback' : ''}.
            </p>
          ) : null}
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
            <option value="bracket_points">Bracket points</option>
            <option value="correct_predictions">Correct predictions</option>
            <option value="accuracy">Accuracy percentage</option>
          </select>
        </div>
      </div>

      {rankedPlayers.length ? (
        <>
          {!hasScoredRows ? (
            <div className="mt-8">
              <EmptyState
                title="No scores yet"
                description="Scores will appear after matches are completed and predictions are scored. Registered players are listed below."
              />
            </div>
          ) : (
            <div className="mt-10">
              <TopThreePodium users={rankedPlayers} />
            </div>
          )}
          <div className="mt-8">
            <ScoreboardTable users={rankedPlayers} currentUserId={user?.id} />
          </div>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No scores yet"
            description="Scores will appear after matches are completed and predictions are scored."
          />
        </div>
      )}
    </main>
  );
}
