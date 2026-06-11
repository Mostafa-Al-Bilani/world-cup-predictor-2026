import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { FilterDropdown } from "../components/FilterDropdown";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MatchCard } from "../components/MatchCard";
import { useAuth } from "../context/AuthContext";
import { MATCHES_UPDATED_EVENT } from "../hooks/useLiveMatchNotifications";
import { matchService } from "../services/matchService";
import { predictionService } from "../services/predictionService";
import { formatDate, isMatchLocked } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";

const statusFilterOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "halftime", label: "Halftime" },
  { value: "extra_time", label: "Extra time" },
  { value: "penalties", label: "Penalties" },
  { value: "finished", label: "Finished" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All statuses" },
];

const predictionFilterOptions = [
  { value: "all", label: "All predictions" },
  { value: "predicted", label: "Predicted" },
  { value: "not_predicted", label: "Missing prediction" },
];

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const groupMatchesByDate = (matches) => {
  const grouped = new Map();

  matches.forEach((match) => {
    const key = formatDate(match.match_date);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(match);
  });

  return Array.from(grouped.entries()).map(([dateLabel, dateMatches]) => ({
    dateLabel,
    matches: dateMatches,
  }));
};

export function MatchesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetMatchId = searchParams.get("match");
  const { user, isAuthenticated } = useAuth();

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyMatchId, setBusyMatchId] = useState(null);
  const [focusedMatchId, setFocusedMatchId] = useState(null);
  const [hasScrolledToTarget, setHasScrolledToTarget] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
    status: "upcoming",
    prediction: "all",
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
        toast.error(getSafeErrorMessage(error, "Could not load matches."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.id]);

  useEffect(() => {
    const handleMatchesUpdated = (event) => {
      if (Array.isArray(event.detail?.matches)) {
        setMatches(event.detail.matches);
      }
    };

    window.addEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);

    return () => {
      window.removeEventListener(MATCHES_UPDATED_EVENT, handleMatchesUpdated);
    };
  }, []);

  const predictionByMatch = useMemo(
    () =>
      new Map(
        predictions.map((prediction) => [prediction.match_id, prediction]),
      ),
    [predictions],
  );

  const stageOptions = useMemo(
    () =>
      Array.from(
        new Set(matches.map((match) => match.stage).filter(Boolean)),
      ).sort(),
    [matches],
  );

  const stageFilterOptions = useMemo(
    () => [
      { value: "all", label: "All stages" },
      ...stageOptions.map((stage) => ({
        value: stage,
        label: stage,
      })),
    ],
    [stageOptions],
  );

  const filteredMatches = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return matches
      .filter((match) => {
        const searchableText =
          `${match.team_a} ${match.team_b} ${match.venue} ${match.city}`.toLowerCase();

        const matchesSearch = !query || searchableText.includes(query);

        const matchesStage =
          filters.stage === "all" || match.stage === filters.stage;

        const matchesStatus =
          filters.status === "all" ||
          normalizeStatus(match.status) === filters.status;

        const hasPrediction = predictionByMatch.has(match.id);

        const matchesPrediction =
          filters.prediction === "all" ||
          (filters.prediction === "predicted" && hasPrediction) ||
          (filters.prediction === "not_predicted" && !hasPrediction);

        return (
          matchesSearch && matchesStage && matchesStatus && matchesPrediction
        );
      })
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  }, [filters, matches, predictionByMatch]);

  const groupedMatches = useMemo(
    () => groupMatchesByDate(filteredMatches),
    [filteredMatches],
  );

  useEffect(() => {
    setHasScrolledToTarget(false);
  }, [targetMatchId]);

  useEffect(() => {
    if (!targetMatchId || !matches.length) return;

    const targetMatch = matches.find((match) => match.id === targetMatchId);
    if (!targetMatch) return;

    setFocusedMatchId(targetMatchId);

    setFilters((current) => ({
      ...current,
      search: "",
      stage: "all",
      status: "all",
      prediction: "all",
    }));
  }, [targetMatchId, matches]);

  useEffect(() => {
    if (loading || !targetMatchId || hasScrolledToTarget) return;

    const timeoutId = window.setTimeout(() => {
      const element = document.getElementById(`match-${targetMatchId}`);

      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        setHasScrolledToTarget(true);

        window.setTimeout(() => {
          setFocusedMatchId(null);
        }, 2500);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [loading, targetMatchId, groupedMatches, hasScrolledToTarget]);

  const updateFilter = (event) => {
    setFilters((value) => ({
      ...value,
      [event.target.name]: event.target.value,
    }));
  };

  const handlePredict = async (match, predictedResult, scoreDraft = {}) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/matches" } });
      return;
    }

    if (isMatchLocked(match) || normalizeStatus(match.status) !== "upcoming") {
      toast.error("Predictions are locked for this match.");
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

      toast.success(`Saved: ${match.team_a} vs ${match.team_b}`);
    } catch (error) {
      const message = getSafeErrorMessage(error, "Could not save prediction.");
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes("match has already started")) {
        toast.error(
          "Predictions are locked because the match has already started.",
        );
      } else if (normalizedMessage.includes("match is not upcoming")) {
        toast.error(
          "Predictions are locked because this match is not open for predictions.",
        );
      } else if (normalizedMessage.includes("predictions are locked")) {
        toast.error("Predictions are locked for this match.");
      } else {
        toast.error(message);
      }
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
            Fixture board
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Predict upcoming matches.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Matches are grouped by date. Upcoming matches are shown by default
            so you can quickly finish missing predictions before kickoff.
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

      {groupedMatches.length ? (
        <div className="mt-8 space-y-10">
          {groupedMatches.map((group) => {
            const predictedCount = group.matches.filter((match) =>
              predictionByMatch.has(match.id),
            ).length;

            return (
              <section key={group.dateLabel}>
                <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {group.dateLabel}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {group.matches.length} matches · {predictedCount}{" "}
                      predicted · {group.matches.length - predictedCount}{" "}
                      missing
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {group.matches.map((match) => (
                    <div
                      key={match.id}
                      id={`match-${match.id}`}
                      className={`scroll-mt-28 rounded-lg transition ${
                        focusedMatchId === match.id
                          ? "ring-2 ring-emerald-300 ring-offset-4 ring-offset-slate-950"
                          : ""
                      }`}
                    >
                      <MatchCard
                        match={match}
                        prediction={predictionByMatch.get(match.id)}
                        isAuthenticated={isAuthenticated}
                        busy={busyMatchId === match.id}
                        onPredict={handlePredict}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="No matches found"
            description="Try showing all statuses, changing the stage, or clearing the search."
          />
        </div>
      )}
    </main>
  );
}