import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { championService } from '../services/championService';
import { getSafeErrorMessage } from '../utils/errors';

export function ChampionPickPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { championPrediction, refreshChampionPrediction, user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTeams() {
      setLoading(true);
      try {
        const rows = await championService.getAvailableTeams();
        setTeams(rows);
        setSelectedTeam((current) => current || rows[0] || '');
      } catch (error) {
        toast.error(getSafeErrorMessage(error, 'Could not load World Cup teams.'));
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await championService.setPrediction({ userId: user.id, predictedTeam: selectedTeam });
      await refreshChampionPrediction();
      toast.success('World Cup winner pick locked.');
      navigate(location.state?.from ?? '/matches', { replace: true });
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not save your champion pick.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading World Cup teams" />;

  return (
    <main className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Tournament pick</p>
        <h1 className="mt-4 text-4xl font-black sm:text-6xl">Pick your World Cup winner.</h1>
        <p className="mt-5 max-w-xl text-slate-300">
          Correct champion prediction gives 3 points. This pick locks after selection and is scored separately from
          match-by-match predictions.
        </p>
      </section>

      <form onSubmit={submit} className="rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl">
        <span className="inline-grid h-14 w-14 place-items-center rounded-lg border border-gold-300/30 bg-gold-300/10 text-gold-300">
          <Crown size={26} />
        </span>
        <h2 className="mt-4 text-2xl font-black text-white">Champion prediction</h2>
        {championPrediction ? (
          <div className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Your pick is locked: <strong>{championPrediction.predicted_team}</strong>.
          </div>
        ) : (
          <>
            <label className="mt-6 block">
              <span className="text-sm font-bold text-slate-300">Team</span>
              <select
                required
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
              >
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving || !selectedTeam}
              className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Locking pick...' : 'Lock champion pick'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
