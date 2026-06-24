import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TeamPicker } from "../components/TeamPicker";
import { TeamLink } from "../components/team/TeamLink.jsx";
import { useAuth } from "../context/AuthContext";
import { championService } from "../services/championService";
import {
  isChampionPredictionLocked,
} from "../utils/championGate";
import { resolveOnboardingDestination } from "../utils/onboarding";
import { getSafeErrorMessage } from "../utils/errors";

export function ChampionPickPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    championPrediction,
    championPredictionsOpen,
    lockChampionPrediction,
  } = useAuth();

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDestination, setPendingDestination] = useState(null);
  const exitOnceRef = useRef(false);

  const safeDestination = resolveOnboardingDestination({
    locationState: location.state,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      setLoading(true);

      try {
        const rows = await championService.getAvailableTeams();

        if (cancelled) return;

        setTeams(rows);
        setSelectedTeam((current) => current || rows[0] || "");
      } catch (error) {
        toast.error(
          getSafeErrorMessage(error, "Could not load World Cup teams."),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingDestination || exitOnceRef.current) return;
    if (!isChampionPredictionLocked(championPrediction)) return;

    exitOnceRef.current = true;
    navigate(pendingDestination, { replace: true });
  }, [championPrediction, navigate, pendingDestination]);

  useEffect(() => {
    if (loading || saving || pendingDestination || exitOnceRef.current) return;
    if (!isChampionPredictionLocked(championPrediction)) return;
    if (!location.state?.from) return;

    exitOnceRef.current = true;
    navigate(safeDestination, { replace: true });
  }, [
    championPrediction,
    loading,
    location.state,
    navigate,
    pendingDestination,
    safeDestination,
    saving,
  ]);

  const continueToDestination = () => {
    if (exitOnceRef.current) return;
    exitOnceRef.current = true;
    navigate(safeDestination, { replace: true });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await lockChampionPrediction(selectedTeam);
      toast.success("World Cup winner pick locked.");
      setPendingDestination(safeDestination);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not save your champion pick."),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading World Cup teams" />;
  }

  if (saving || pendingDestination) {
    return <LoadingSpinner label="Locking World Cup winner pick" />;
  }

  return (
    <main className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <section>
        <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
          Tournament pick
        </p>

        <h1 className="mt-4 text-4xl font-black sm:text-6xl">
          Pick your World Cup winner.
        </h1>

        <p className="mt-5 max-w-xl text-slate-300">
          Correct champion prediction gives 3 points. This pick locks after
          selection and is scored separately from match-by-match predictions.
        </p>
      </section>

      <form
        onSubmit={submit}
        className="rounded-lg border border-white/10 bg-slate-950/76 p-6 shadow-2xl"
      >
        <span className="inline-grid h-14 w-14 place-items-center rounded-lg border border-gold-300/30 bg-gold-300/10 text-gold-300">
          <Crown size={26} />
        </span>

        <h2 className="mt-4 text-2xl font-black text-white">
          Champion prediction
        </h2>

        {championPrediction ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              Your pick is locked:{" "}
              <TeamLink team={championPrediction.predicted_team}>
                <strong>{championPrediction.predicted_team}</strong>
              </TeamLink>
              .
            </div>
            <button
              type="button"
              onClick={continueToDestination}
              className="w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white"
            >
              Continue to matches
            </button>
          </div>
        ) : !championPredictionsOpen ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              Champion predictions are closed for this tournament. You can
              continue using the app without selecting a champion pick.
            </div>
            <button
              type="button"
              onClick={continueToDestination}
              className="w-full rounded-full border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-slate-950"
            >
              Continue to matches
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6">
              <TeamPicker
                label="Team"
                name="champion"
                teams={teams}
                value={selectedTeam}
                onChange={setSelectedTeam}
                helperText="This pick cannot be changed after locking."
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedTeam}
              className="mt-6 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Locking pick..." : "Lock champion pick"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
