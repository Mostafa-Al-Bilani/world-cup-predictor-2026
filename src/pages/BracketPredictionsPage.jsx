import { CheckCircle2, Lock, Save, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { TeamFlag } from "../components/TeamFlag";
import { useAuth } from "../context/AuthContext";
import { championService } from "../services/championService";
import { matchService } from "../services/matchService";
import { stagePredictionService } from "../services/stagePredictionService";
import { formatDateTime } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import {
  STAGE_PREDICTION_CONFIGS,
  getActualTeamsForStage,
  getStageLockAt,
  getStageOpenAt,
  getStageWindowMessage,
  isStageLocked,
  isStageOpen,
  validateStageSelection,
} from "../utils/stagePredictions";

const previousStageByStage = {
  round_of_32: null,
  round_of_16: "round_of_32",
  quarter_finals: "round_of_16",
  semi_finals: "quarter_finals",
  finalists: "semi_finals",
};

const stageStatus = ({ locked, prediction }) => {
  if (prediction?.scored_at) return "scored";
  if (locked) return "locked";
  if (prediction) return "saved";
  return "incomplete";
};

const statusStyles = {
  incomplete: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  saved: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  locked: "border-slate-300/30 bg-slate-300/10 text-slate-100",
  scored: "border-gold-300/40 bg-gold-300/10 text-gold-100",
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const isGroupStage = (stage) => normalizeText(stage).startsWith("group");

const extractGroupLabel = (stage) => {
  const text = String(stage ?? "").trim();
  const groupMatch = text.match(/group\s+([a-z0-9]+)/i);

  if (groupMatch?.[1]) {
    return `Group ${groupMatch[1].toUpperCase()}`;
  }

  return "Other";
};

const buildTeamGroupMap = (matches) => {
  const map = new Map();

  matches.forEach((match) => {
    if (!isGroupStage(match.stage)) return;

    const groupLabel = extractGroupLabel(match.stage);

    [match.team_a, match.team_b].forEach((team) => {
      if (!team) return;

      const normalizedTeam = normalizeText(team);

      if (
        !normalizedTeam ||
        normalizedTeam === "tbd" ||
        normalizedTeam.includes("winner") ||
        normalizedTeam.includes("runner up") ||
        normalizedTeam.includes("third")
      ) {
        return;
      }

      if (!map.has(team)) {
        map.set(team, groupLabel);
      }
    });
  });

  return map;
};

const getGroupSortValue = (groupLabel) => {
  if (!groupLabel || groupLabel === "Other") return "ZZZ";
  return groupLabel;
};

const groupSelectableTeams = ({ teams, teamGroupMap }) => {
  const groups = new Map();

  teams.forEach((team) => {
    const groupLabel = teamGroupMap.get(team) ?? "Other";

    if (!groups.has(groupLabel)) {
      groups.set(groupLabel, []);
    }

    groups.get(groupLabel).push(team);
  });

  return Array.from(groups.entries())
    .map(([groupLabel, groupTeams]) => ({
      groupLabel,
      teams: [...groupTeams].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const groupCompare = getGroupSortValue(a.groupLabel).localeCompare(
        getGroupSortValue(b.groupLabel),
      );

      if (groupCompare !== 0) return groupCompare;

      return a.groupLabel.localeCompare(b.groupLabel);
    });
};

const getRoundOf32GroupCounts = ({ selectedTeams, teamGroupMap }) => {
  const counts = new Map();

  selectedTeams.forEach((team) => {
    const groupLabel = teamGroupMap.get(team) ?? "Other";
    counts.set(groupLabel, (counts.get(groupLabel) ?? 0) + 1);
  });

  return counts;
};

export function BracketPredictionsPage() {
  const {
    championPrediction: contextChampionPrediction,
    refreshChampionPrediction,
    user,
  } = useAuth();

  const [availableTeams, setAvailableTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stageWindows, setStageWindows] = useState([]);
  const [championPick, setChampionPick] = useState(
    contextChampionPrediction ?? null,
  );
  const [drafts, setDrafts] = useState({});
  const [savingStage, setSavingStage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [teams, matchRows, predictionRows, championRow, stageWindowRows] =
        await Promise.all([
          stagePredictionService.getAvailableTeams(),
          matchService.getMatches(),
          stagePredictionService.getMyPredictions(user.id),
          championService.getMyPrediction(user.id),
          stagePredictionService.getStageWindows(),
        ]);

      const nextDrafts = Object.fromEntries(
        STAGE_PREDICTION_CONFIGS.map((stage) => [
          stage.key,
          predictionRows.find((prediction) => prediction.stage === stage.key)
            ?.selected_teams ?? [],
        ]),
      );

      setAvailableTeams(teams);
      setMatches(matchRows);
      setPredictions(predictionRows);
      setStageWindows(stageWindowRows);
      setDrafts(nextDrafts);
      setChampionPick(championRow ?? contextChampionPrediction ?? null);

      if (championRow && !contextChampionPrediction) {
        refreshChampionPrediction?.();
      }
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not load bracket predictions."),
      );
    } finally {
      setLoading(false);
    }
  }, [contextChampionPrediction, refreshChampionPrediction, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const teamGroupMap = useMemo(() => buildTeamGroupMap(matches), [matches]);

  const predictionByStage = useMemo(
    () =>
      new Map(predictions.map((prediction) => [prediction.stage, prediction])),
    [predictions],
  );

  const getStageConfig = useCallback((stageKey) => {
    return STAGE_PREDICTION_CONFIGS.find((stage) => stage.key === stageKey);
  }, []);

  const getStageDependency = useCallback(
    (stageKey) => {
      const previousStageKey = previousStageByStage[stageKey];

      if (!previousStageKey) {
        return {
          previousStageKey: null,
          previousStageConfig: null,
          previousStageActualTeams: [],
          dependencyReady: true,
        };
      }

      const previousStageConfig = getStageConfig(previousStageKey);
      const previousStageActualTeams = getActualTeamsForStage(
        matches,
        previousStageKey,
      );

      return {
        previousStageKey,
        previousStageConfig,
        previousStageActualTeams,
        dependencyReady:
          previousStageActualTeams.length === previousStageConfig.requiredCount,
      };
    },
    [getStageConfig, matches],
  );

  const getSelectableTeamsForStage = useCallback(
    (stageKey) => {
      const { previousStageKey, previousStageActualTeams } =
        getStageDependency(stageKey);

      if (!previousStageKey) {
        return [...availableTeams].sort((a, b) => {
          const aGroup = teamGroupMap.get(a) ?? "Other";
          const bGroup = teamGroupMap.get(b) ?? "Other";

          const groupCompare = getGroupSortValue(aGroup).localeCompare(
            getGroupSortValue(bGroup),
          );

          if (groupCompare !== 0) return groupCompare;

          return a.localeCompare(b);
        });
      }

      return [...previousStageActualTeams].sort((a, b) => {
        const aGroup = teamGroupMap.get(a) ?? "Other";
        const bGroup = teamGroupMap.get(b) ?? "Other";

        const groupCompare = getGroupSortValue(aGroup).localeCompare(
          getGroupSortValue(bGroup),
        );

        if (groupCompare !== 0) return groupCompare;

        return a.localeCompare(b);
      });
    },
    [availableTeams, getStageDependency, teamGroupMap],
  );

  const toggleTeam = (stage, team) => {
    const config = getStageConfig(stage);
    const selectableTeams = getSelectableTeamsForStage(stage);

    if (!selectableTeams.includes(team)) {
      toast.error("This team is not available for this round yet.");
      return;
    }

    setDrafts((current) => {
      const selected = current[stage] ?? [];

      if (selected.includes(team)) {
        return {
          ...current,
          [stage]: selected.filter((item) => item !== team),
        };
      }

      if (selected.length >= config.requiredCount) {
        toast.error(
          `Select exactly ${config.requiredCount} teams. Remove one before adding another.`,
        );
        return current;
      }

      if (stage === "round_of_32") {
        const groupLabel = teamGroupMap.get(team) ?? "Other";
        const groupCounts = getRoundOf32GroupCounts({
          selectedTeams: selected,
          teamGroupMap,
        });
        const currentGroupCount = groupCounts.get(groupLabel) ?? 0;

        if (groupLabel !== "Other" && currentGroupCount >= 3) {
          toast.error(
            `${groupLabel} already has 3 selected teams. In World Cup 2026, at most 3 teams can advance from one group.`,
          );
          return current;
        }
      }

      return { ...current, [stage]: [...selected, team] };
    });
  };

  const saveStage = async (stage) => {
    const { dependencyReady, previousStageConfig } = getStageDependency(stage);
    const stageIsOpen = isStageOpen(stageWindows, stage);

    if (!dependencyReady && !stageIsOpen) {
      toast.error(
        `This round opens after the ${previousStageConfig.label} teams are known.`,
      );
      return;
    }

    const selectableTeams = getSelectableTeamsForStage(stage);

    setSavingStage(stage);

    try {
      const selectedTeams = validateStageSelection({
        stage,
        selectedTeams: drafts[stage] ?? [],
        availableTeams: selectableTeams,
      });

      const saved = await stagePredictionService.savePrediction({
        userId: user.id,
        stage,
        selectedTeams,
        availableTeams: selectableTeams,
      });

      setPredictions((current) => [
        saved,
        ...current.filter((prediction) => prediction.stage !== saved.stage),
      ]);

      setDrafts((current) => ({
        ...current,
        [saved.stage]: saved.selected_teams ?? [],
      }));

      toast.success(`${getStageConfig(stage)?.label} prediction saved.`);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not save this bracket prediction."),
      );
    } finally {
      setSavingStage("");
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading bracket predictions" />;
  }

  const visibleStages = STAGE_PREDICTION_CONFIGS.filter((stage) => {
    const { dependencyReady } = getStageDependency(stage.key);
    return dependencyReady || isStageOpen(stageWindows, stage.key);
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Bracket predictions
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Pick who advances.
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            Predict each round only when that round becomes available. Teams are
            grouped by their group-stage group to make selection easier.
          </p>
        </div>

        <div className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-4 text-sm text-gold-100 lg:max-w-sm">
          <p className="font-black">Champion remains separate</p>

          {championPick ? (
            <p className="mt-1 text-slate-200">
              Your locked champion pick is{" "}
              <span className="font-black text-gold-300">
                {championPick.predicted_team}
              </span>
              . It is worth 3 points if correct.
            </p>
          ) : (
            <p className="mt-1 text-slate-200">
              You have not selected a champion yet. Champion prediction is worth
              3 points.
            </p>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="font-black text-emerald-100">
          Bracket predictions are round-by-round.
        </p>

        <p className="mt-1 text-sm text-slate-200">
          Round of 32 closes on June 16, 2026. Later rounds open after the
          previous round&apos;s qualified teams are known, then close 24 hours
          later.
        </p>

        <p className="mt-2 text-sm text-slate-200">
          For the Round of 32, you can select up to 3 teams from the same group:
          top two plus possible best third-place qualifier.
        </p>
      </section>

      {!availableTeams.length ? (
        <div className="mt-8">
          <EmptyState
            title="No teams available"
            description="Tournament teams will appear here after fixtures are seeded or synced."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {visibleStages.map((stage) => {
            const prediction = predictionByStage.get(stage.key);
            const selected = drafts[stage.key] ?? [];
            const lockAt = getStageLockAt(matches, stage.key, stageWindows);
            const openedAt = getStageOpenAt(stageWindows, stage.key);
            const locked = isStageLocked(lockAt);
            const actualTeams = getActualTeamsForStage(matches, stage.key);
            const selectableTeams = getSelectableTeamsForStage(stage.key);
            const groupedTeams = groupSelectableTeams({
              teams: selectableTeams,
              teamGroupMap,
            });

            const { previousStageConfig } = getStageDependency(stage.key);

            const windowMessage = getStageWindowMessage({
              stage: stage.key,
              lockAt,
              openedAt,
              dependencyLabel: previousStageConfig?.label,
            });

            const status = stageStatus({
              locked,
              prediction,
            });

            const canEdit = !locked && !prediction?.scored_at;
            const isComplete = selected.length === stage.requiredCount;

            return (
              <section
                key={stage.key}
                className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/72"
              >
                <div className="border-b border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusStyles[status]}`}
                        >
                          {status}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase text-slate-300">
                          {selected.length}/{stage.requiredCount} selected
                        </span>
                      </div>

                      <h2 className="mt-3 text-2xl font-black text-white">
                        {stage.label}
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm text-slate-300">
                        {stage.description}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
                      <Metric
                        label="Each correct"
                        value={`${stage.pointsPerTeam} pts`}
                      />
                      <Metric
                        label="Max points"
                        value={stage.requiredCount * stage.pointsPerTeam}
                      />
                      <Metric
                        label="Earned"
                        value={prediction?.points_awarded ?? 0}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-300 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
                      <span className="inline-flex items-center gap-2 font-bold text-white">
                        <Lock size={15} className="text-gold-300" />
                        {lockAt
                          ? `Closes ${formatDateTime(lockAt)}`
                          : "Not open yet"}
                      </span>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {windowMessage}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-300" />
                      {stage.key === "round_of_32"
                        ? `Tournament teams available: ${availableTeams.length}`
                        : `Actual teams known: ${actualTeams.length}/${stage.requiredCount}`}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="space-y-5">
                    {groupedTeams.map((group) => {
                      const selectedInGroup = group.teams.filter((team) =>
                        selected.includes(team),
                      ).length;

                      return (
                        <section
                          key={`${stage.key}-${group.groupLabel}`}
                          className="rounded-lg border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">
                              {group.groupLabel}
                            </h3>

                            <p className="text-xs font-bold text-slate-400">
                              {selectedInGroup}/{group.teams.length} selected
                              {stage.key === "round_of_32" &&
                              group.groupLabel !== "Other"
                                ? " · max 3"
                                : ""}
                            </p>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {group.teams.map((team) => {
                              const active = selected.includes(team);
                              const disabled =
                                !canEdit ||
                                (!active &&
                                  selected.length >= stage.requiredCount);

                              return (
                                <button
                                  key={team}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => toggleTeam(stage.key, team)}
                                  className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                                    active
                                      ? "border-emerald-300 bg-emerald-300/15 text-white"
                                      : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-emerald-300/50 hover:bg-white/[0.06]"
                                  } disabled:cursor-not-allowed disabled:opacity-55`}
                                >
                                  <TeamFlag size="md" teamName={team} />

                                  <span className="min-w-0 flex-1 truncate text-sm font-black">
                                    {team}
                                  </span>

                                  <span className="shrink-0 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-black uppercase text-slate-400">
                                    {teamGroupMap.get(team) ?? "Other"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  {prediction?.scored_at ? (
                    <div className="mt-5 rounded-lg border border-gold-300/30 bg-gold-300/10 p-4 text-sm text-gold-100">
                      <p className="font-black">
                        Scored {prediction.correct_count ?? 0}/
                        {stage.requiredCount} correct for{" "}
                        {prediction.points_awarded ?? 0} points.
                      </p>

                      {prediction.correct_teams?.length ? (
                        <p className="mt-1 text-slate-200">
                          Correct: {prediction.correct_teams.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                      {canEdit
                        ? isComplete
                          ? "Ready to save."
                          : `Select exactly ${stage.requiredCount} teams before saving.`
                        : "This stage is read-only because it is locked or scored."}
                    </p>

                    <button
                      type="button"
                      disabled={
                        !canEdit || !isComplete || savingStage === stage.key
                      }
                      onClick={() => saveStage(stage.key)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingStage === stage.key ? (
                        <Trophy size={16} className="animate-pulse" />
                      ) : (
                        <Save size={16} />
                      )}

                      {savingStage === stage.key ? "Saving..." : "Save stage"}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-950/70 px-4 py-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
    </div>
  );
}
