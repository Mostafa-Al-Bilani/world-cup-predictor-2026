import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { EmptyState } from "../components/EmptyState";
import { FilterDropdown } from "../components/FilterDropdown";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ScoreboardTable } from "../components/ScoreboardTable";
import { TopThreePodium } from "../components/TopThreePodium";
import { useAuth } from "../context/AuthContext";
import { groupService } from "../services/groupService";
import { profileService } from "../services/profileService";
import { syncLogService } from "../services/syncLogService";
import { formatDateTime } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import {
  hasScoredLeaderboardEntries,
  sortLeaderboardUsers,
} from "../utils/leaderboard";
import { getAccuracy } from "../utils/predictions";

const scoreboardSortOptions = [
  { value: "total_points", label: "Total points" },
  { value: "match_winner_points", label: "Winner points" },
  { value: "exact_score_points", label: "Exact score points" },
  { value: "champion_points", label: "Champion points" },
  { value: "bracket_points", label: "Bracket points" },
  { value: "correct_predictions", label: "Correct finished picks" },
  { value: "accuracy", label: "Accuracy percentage" },
];

const scoreboardScopeOptions = [
  { value: "global", label: "Global scoreboard" },
  { value: "group", label: "My group scoreboard" },
];

export function ScoreboardPage() {
  const { user, isAuthenticated } = useAuth();

  const [globalPlayers, setGlobalPlayers] = useState([]);
  const [groupPlayers, setGroupPlayers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [scope, setScope] = useState("global");

  const [loading, setLoading] = useState(true);
  const [groupLoading, setGroupLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total_points");
  const [latestSync, setLatestSync] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const [leaderboard, syncLog, myGroups] = await Promise.all([
          profileService.getLeaderboard(),
          syncLogService.getLatestSuccessfulSync().catch(() => null),
          isAuthenticated
            ? groupService.getMyGroups(user?.id).catch(() => [])
            : Promise.resolve([]),
        ]);

        setGlobalPlayers(leaderboard);
        setLatestSync(syncLog);
        setGroups(myGroups);

        if (myGroups.length) {
          setSelectedGroupId((current) => current || myGroups[0].id);
        }
      } catch (error) {
        toast.error(getSafeErrorMessage(error, "Could not load scoreboard."));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    async function loadGroupLeaderboard() {
      if (!isAuthenticated || !selectedGroupId || scope !== "group") {
        setGroupPlayers([]);
        return;
      }

      setGroupLoading(true);

      try {
        const leaderboard =
          await groupService.getGroupLeaderboard(selectedGroupId);

        setGroupPlayers(leaderboard);
      } catch (error) {
        toast.error(
          getSafeErrorMessage(error, "Could not load group scoreboard."),
        );
      } finally {
        setGroupLoading(false);
      }
    }

    loadGroupLeaderboard();
  }, [isAuthenticated, scope, selectedGroupId]);

  const activePlayers = scope === "group" ? groupPlayers : globalPlayers;

  const rankedPlayers = useMemo(() => {
    return sortLeaderboardUsers(activePlayers)
      .sort((a, b) => {
        const primary =
          sortBy === "accuracy"
            ? getAccuracy(b) - getAccuracy(a)
            : (b[sortBy] ?? 0) - (a[sortBy] ?? 0);

        if (primary !== 0) return primary;

        if ((b.total_points ?? 0) !== (a.total_points ?? 0)) {
          return (b.total_points ?? 0) - (a.total_points ?? 0);
        }

        if (
          (b.match_winner_points ?? 0) !==
          (a.match_winner_points ?? 0)
        ) {
          return (b.match_winner_points ?? 0) - (a.match_winner_points ?? 0);
        }

        if ((b.exact_score_points ?? 0) !== (a.exact_score_points ?? 0)) {
          return (b.exact_score_points ?? 0) - (a.exact_score_points ?? 0);
        }

        if ((b.correct_predictions ?? 0) !== (a.correct_predictions ?? 0)) {
          return (b.correct_predictions ?? 0) - (a.correct_predictions ?? 0);
        }

        return a.username.localeCompare(b.username);
      });
  }, [activePlayers, sortBy]);

  // Search only narrows the visible list; rank, player count, and top
  // score stay based on the full leaderboard.
  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rankedPlayers;

    return rankedPlayers.filter((player) =>
      player.username.toLowerCase().includes(query),
    );
  }, [rankedPlayers, search]);

  const selectedGroup = groups.find((group) => group.id === selectedGroupId);
  const hasScoredRows = hasScoredLeaderboardEntries(visiblePlayers);

  const currentUserRank =
    rankedPlayers.findIndex((player) => player.id === user?.id) + 1;

  const topScore = rankedPlayers[0]?.total_points ?? 0;

  const currentUserRow = rankedPlayers.find((player) => player.id === user?.id);

  const handleScopeChange = (event) => {
    setScope(event.target.value);
    setSearch("");
  };

  const handleGroupChange = (event) => {
    setSelectedGroupId(event.target.value);
    setSearch("");
  };

  if (loading) {
    return <LoadingSpinner label="Loading scoreboard" />;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Rankings
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            {scope === "group" ? "Group scoreboard" : "Global scoreboard"}
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Rankings are based on total points collected from match winner
            picks, exact score bonuses, champion picks, and bracket picks.
            Accuracy only counts predictions for matches that have finished.
          </p>

          {latestSync ? (
            <p className="mt-3 text-sm text-slate-400">
              Fixture data last updated {formatDateTime(latestSync.finished_at)}{" "}
              from {latestSync.provider}
              {latestSync.fallback_used ? " fallback" : ""}.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[720px] xl:grid-cols-4">
          <FilterDropdown
            name="scope"
            value={scope}
            options={scoreboardScopeOptions}
            onChange={handleScopeChange}
          />

          <FilterDropdown
            name="sortBy"
            value={sortBy}
            options={scoreboardSortOptions}
            onChange={(event) => setSortBy(event.target.value)}
          />

          {scope === "group" ? (
            <FilterDropdown
              name="selectedGroupId"
              value={selectedGroupId}
              options={
                groups.length
                  ? groups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))
                  : [{ value: "", label: "No groups yet" }]
              }
              onChange={handleGroupChange}
            />
          ) : null}

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-300"
            placeholder="Search username"
          />
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreSummaryCard
          label={scope === "group" ? "Group players" : "Global players"}
          value={rankedPlayers.length}
        />

        <ScoreSummaryCard
          label="Your rank"
          value={currentUserRank > 0 ? `#${currentUserRank}` : "-"}
        />

        <ScoreSummaryCard label="Top score" value={topScore} />

        <ScoreSummaryCard
          label="Your total points"
          value={currentUserRow?.total_points ?? 0}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreSummaryCard
          label="Winner points"
          value={currentUserRow?.match_winner_points ?? 0}
        />

        <ScoreSummaryCard
          label="Exact score points"
          value={currentUserRow?.exact_score_points ?? 0}
        />

        <ScoreSummaryCard
          label="Champion points"
          value={currentUserRow?.champion_points ?? 0}
        />

        <ScoreSummaryCard
          label="Bracket points"
          value={currentUserRow?.bracket_points ?? 0}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreSummaryCard
          label="Correct finished picks"
          value={currentUserRow?.correct_predictions ?? 0}
        />

        <ScoreSummaryCard
          label="Finished picks"
          value={currentUserRow?.total_predictions ?? 0}
        />

        <ScoreSummaryCard
          label="Accuracy"
          value={currentUserRow ? `${getAccuracy(currentUserRow)}%` : "0%"}
        />

        <ScoreSummaryCard
          label="View"
          value={scope === "group" ? selectedGroup?.name ?? "Group" : "Global"}
        />
      </section>

      {scope === "group" && !isAuthenticated ? (
        <div className="mt-8">
          <EmptyState
            title="Log in to view group rankings"
            description="Group scoreboards are private and only visible to group members."
          />
        </div>
      ) : null}

      {scope === "group" && isAuthenticated && !groups.length ? (
        <div className="mt-8">
          <EmptyState
            title="You are not in any groups yet"
            description="Create or join a group to compare your score with friends."
          />
        </div>
      ) : null}

      {groupLoading ? (
        <div className="mt-8">
          <LoadingSpinner label="Loading group scoreboard" />
        </div>
      ) : null}

      {!groupLoading && visiblePlayers.length ? (
        <>
          {!hasScoredRows ? (
            <div className="mt-8">
              <EmptyState
                title="No scores yet"
                description={
                  scope === "group"
                    ? "This group has no scored predictions yet. Scores will appear after matches are completed."
                    : "Scores will appear after matches are completed and predictions are scored. Registered players are listed below."
                }
              />
            </div>
          ) : (
            <div className="mt-10">
              <TopThreePodium users={visiblePlayers} />
            </div>
          )}

          <div className="mt-8">
            <ScoreboardTable users={visiblePlayers} currentUserId={user?.id} />
          </div>
        </>
      ) : null}

      {!groupLoading &&
      !visiblePlayers.length &&
      !(scope === "group" && (!isAuthenticated || !groups.length)) ? (
        <div className="mt-8">
          <EmptyState
            title="No rankings found"
            description="Try clearing the search or switching scoreboard view."
          />
        </div>
      ) : null}
    </main>
  );
}

function ScoreSummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 truncate text-3xl font-black text-white">{value}</p>
    </article>
  );
}