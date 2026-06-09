import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MatchCard } from '../components/MatchCard';
import { useAuth } from '../context/AuthContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import { isMatchLocked } from '../utils/date';

export function MatchesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [filters, setFilters] = useState({ search: '', stage: 'all', status: 'all' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchRows, predictionRows] = await Promise.all([
          matchService.getMatches(),
          predictionService.getPredictionsForUser(user?.id),
        ]);
        setMatches(matchRows);
        setPredictions(predictionRows);
      } catch (error) {
        toast.error(error.message ?? 'Could not load matches.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const predictionByMatch = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.match_id, prediction])),
    [predictions],
  );

  const stageOptions = useMemo(() => Array.from(new Set(matches.map((match) => match.stage))).sort(), [matches]);

  const filteredMatches = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return matches.filter((match) => {
      const matchesSearch =
        !query || `${match.team_a} ${match.team_b} ${match.venue} ${match.city}`.toLowerCase().includes(query);
      const matchesStage = filters.stage === 'all' || match.stage === filters.stage;
      const matchesStatus = filters.status === 'all' || match.status === filters.status;
      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [filters, matches]);

  const updateFilter = (event) => {
    setFilters((value) => ({ ...value, [event.target.name]: event.target.value }));
  };

  const handlePredict = async (match, predictedResult) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/matches' } });
      return;
    }
    if (isMatchLocked(match) || match.status !== 'upcoming') {
      toast.error('Predictions are locked for this match.');
      return;
    }

    setBusyMatchId(match.id);
    try {
      const saved = await predictionService.upsertPrediction({
        userId: user.id,
        matchId: match.id,
        predictedResult,
      });
      setPredictions((items) => [
        ...items.filter((prediction) => prediction.match_id !== match.id),
        saved,
      ]);
      toast.success('Prediction saved.');
    } catch (error) {
      toast.error(error.message ?? 'Could not save prediction.');
    } finally {
      setBusyMatchId(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading match schedule" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Full fixture board</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Predict every match.</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Choose Team A, draw, or Team B before kickoff. Once a match starts, the card locks.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:w-[680px]">
          <input
            name="search"
            value={filters.search}
            onChange={updateFilter}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-300"
            placeholder="Search team or city"
          />
          <select
            name="stage"
            value={filters.stage}
            onChange={updateFilter}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-300"
          >
            <option value="all">All stages</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
          <select
            name="status"
            value={filters.status}
            onChange={updateFilter}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-emerald-300"
          >
            <option value="all">All statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      </div>

      {filteredMatches.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictionByMatch.get(match.id)}
              isAuthenticated={isAuthenticated}
              busy={busyMatchId === match.id}
              onPredict={handlePredict}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No matches found" description="Try a different team, stage, or match status." />
        </div>
      )}
    </main>
  );
}
