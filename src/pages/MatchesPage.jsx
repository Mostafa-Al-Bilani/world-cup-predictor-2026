import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { FilterDropdown } from '../components/FilterDropdown';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MatchCard } from '../components/MatchCard';
import { useAuth } from '../context/AuthContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import { isMatchLocked } from '../utils/date';
import { getSafeErrorMessage } from '../utils/errors';

const statusFilterOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'halftime', label: 'Halftime' },
  { value: 'finished', label: 'Finished' },
  { value: 'postponed', label: 'Postponed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const predictionFilterOptions = [
  { value: 'all', label: 'All' },
  { value: 'predicted', label: 'Predicted' },
  { value: 'not_predicted', label: 'Not predicted' },
];

export function MatchesPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyMatchId, setBusyMatchId] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    stage: 'all',
    status: 'all',
    prediction: 'all',
  });

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
        toast.error(getSafeErrorMessage(error, 'Could not load matches.'));
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

  const stageOptions = useMemo(
    () => Array.from(new Set(matches.map((match) => match.stage).filter(Boolean))).sort(),
    [matches],
  );

  const stageFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All stages' },
      ...stageOptions.map((stage) => ({
        value: stage,
        label: stage,
      })),
    ],
    [stageOptions],
  );

  const filteredMatches = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return matches.filter((match) => {
      const searchableText = `${match.team_a} ${match.team_b} ${match.venue} ${match.city}`.toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesStage =
        filters.stage === 'all' || match.stage === filters.stage;

      const matchesStatus =
        filters.status === 'all' || match.status === filters.status;

      const hasPrediction = predictionByMatch.has(match.id);

      const matchesPrediction =
        filters.prediction === 'all' ||
        (filters.prediction === 'predicted' && hasPrediction) ||
        (filters.prediction === 'not_predicted' && !hasPrediction);

      return matchesSearch && matchesStage && matchesStatus && matchesPrediction;
    });
  }, [filters, matches, predictionByMatch]);

  const updateFilter = (event) => {
    setFilters((value) => ({
      ...value,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePredict = async (match, predictedResult, scoreDraft = {}) => {
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
        predictedHomeScore: scoreDraft.predictedHomeScore,
        predictedAwayScore: scoreDraft.predictedAwayScore,
      });

      setPredictions((items) => [
        ...items.filter((prediction) => prediction.match_id !== match.id),
        saved,
      ]);

      toast.success('Prediction saved.');
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not save prediction.'));
    } finally {
      setBusyMatchId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading match schedule" />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Full fixture board
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Predict every match.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Choose the group-stage result or knockout final winner, then add an optional exact score for a bonus point.
            Once a match starts, the card locks.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[900px] xl:grid-cols-4">
          <input
            name="search"
            value={filters.search}
            onChange={updateFilter}
            className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
            placeholder="Search team or city"
          />

          <FilterDropdown
            name="stage"
            value={filters.stage}
            options={stageFilterOptions}
            onChange={updateFilter}
          />

          <FilterDropdown
            name="status"
            value={filters.status}
            options={statusFilterOptions}
            onChange={updateFilter}
          />

          <FilterDropdown
            name="prediction"
            value={filters.prediction}
            options={predictionFilterOptions}
            onChange={updateFilter}
          />
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
          <EmptyState
            title="No matches found"
            description="Try a different team, stage, match status, or prediction filter."
          />
        </div>
      )}
    </main>
  );
}