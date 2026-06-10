import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { matchService } from '../services/matchService';
import { predictionService } from '../services/predictionService';
import { formatDateTime, isMatchLocked } from '../utils/date';
import { getSafeErrorMessage } from '../utils/errors';
import { getPredictedScoreLabel, getPredictionLabel, getPredictionStatus, getPredictionTotalPoints } from '../utils/predictions';

const filters = [
  { value: 'all', label: 'All predictions' },
  { value: 'correct', label: 'Correct' },
  { value: 'wrong', label: 'Wrong' },
  { value: 'pending', label: 'Pending' },
];

export function MyPredictionsPage() {
  const { championPrediction, user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [matchRows, predictionRows] = await Promise.all([
          matchService.getMatches(),
          predictionService.getPredictionsForUser(user.id),
        ]);
        setMatches(matchRows);
        setPredictions(predictionRows);
      } catch (error) {
        toast.error(getSafeErrorMessage(error, 'Could not load your predictions.'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user.id]);

  const rows = useMemo(() => {
    const matchById = new Map(matches.map((match) => [match.id, match]));
    return predictions
      .map((prediction) => ({ prediction, match: matchById.get(prediction.match_id) }))
      .filter(({ match }) => Boolean(match))
      .filter(({ prediction }) => {
        if (activeFilter === 'correct') return prediction.is_correct === true;
        if (activeFilter === 'wrong') return prediction.is_correct === false;
        if (activeFilter === 'pending') return prediction.is_correct === null;
        return true;
      });
  }, [activeFilter, matches, predictions]);

  if (loading) return <LoadingSpinner label="Loading your predictions" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Your calls</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">My Predictions</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeFilter === filter.value ? 'bg-emerald-300 text-emerald-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {championPrediction ? (
        <section className="mt-8 rounded-lg border border-gold-300/30 bg-gold-300/10 p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold-300">World Cup winner pick</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-black text-white">{championPrediction.predicted_team}</h2>
            <p className="text-sm font-bold text-slate-200">
              Champion points: <span className="text-gold-300">{championPrediction.points_awarded ?? 0}</span> / 3
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Bracket predictions</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-200">
            Pick which teams advance before each knockout stage locks. These picks are optional and scored separately.
          </p>
          <Link
            to="/bracket"
            className="inline-flex justify-center rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-white"
          >
            Open bracket
          </Link>
        </div>
      </section>

      {rows.length ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-slate-950/72">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-5 py-4">Match</th>
                  <th className="px-5 py-4">Prediction</th>
                  <th className="px-5 py-4">Score Pick</th>
                  <th className="px-5 py-4">Actual</th>
                  <th className="px-5 py-4">Winner</th>
                  <th className="px-5 py-4">Exact</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Editable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map(({ match, prediction }) => (
                  <tr key={prediction.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-bold text-white">
                      {match.team_a} vs {match.team_b}
                    </td>
                    <td className="px-5 py-4 text-slate-300">{getPredictionLabel(match, prediction.predicted_result)}</td>
                    <td className="px-5 py-4 text-slate-300">{getPredictedScoreLabel(prediction)}</td>
                    <td className="px-5 py-4 text-slate-300">
                      {match.result ? `${getPredictionLabel(match, match.result)} (${match.team_a_score ?? '-'}-${match.team_b_score ?? '-'})` : 'Pending'}
                    </td>
                    <td className="px-5 py-4 text-slate-300">{prediction.winner_points ?? Number(prediction.is_correct === true)}</td>
                    <td className="px-5 py-4 text-slate-300">{prediction.exact_score_points ?? 0}</td>
                    <td className="px-5 py-4 font-black text-gold-300">{getPredictionTotalPoints(prediction)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge label={getPredictionStatus(match, prediction)} />
                    </td>
                    <td className="px-5 py-4 text-slate-300">{formatDateTime(match.match_date)}</td>
                    <td className="px-5 py-4 text-slate-300">{!isMatchLocked(match) && match.status === 'upcoming' ? 'Yes' : 'Locked'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No predictions yet"
            description="Visit the matches page and lock in your first call before kickoff."
          />
        </div>
      )}
    </main>
  );
}
