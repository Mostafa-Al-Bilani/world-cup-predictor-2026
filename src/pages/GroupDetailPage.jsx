import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Copy,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  UserMinus,
} from "lucide-react";
import { ConfirmationModal } from "../components/ConfirmationModal";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ScoreboardTable } from "../components/ScoreboardTable";
import { StatusBadge } from "../components/StatusBadge";
import { TeamFlag } from "../components/TeamFlag";
import { TopThreePodium } from "../components/TopThreePodium";
import { useAuth } from "../context/AuthContext";
import { groupService } from "../services/groupService";
import { formatDate, formatDateTime } from "../utils/date";
import { getSafeErrorMessage } from "../utils/errors";
import {
  getPredictedScoreLabel,
  getPredictionLabel,
} from "../utils/predictions";

export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [confirmAction, setConfirmAction] = useState(null);
  const [livePredictions, setLivePredictions] = useState([]);
  const [livePredictionsLoading, setLivePredictionsLoading] = useState(false);
  const [liveSettingBusy, setLiveSettingBusy] = useState(false);

  const currentMember = useMemo(
    () => members.find((member) => member.user_id === user?.id),
    [members, user?.id],
  );

  const canManage =
    group?.owner_id === user?.id ||
    ["owner", "admin"].includes(currentMember?.role);

  const isOwner = group?.owner_id === user?.id;

  const inviteLink = group?.invite_code
    ? `${window.location.origin}${window.location.pathname}#/groups?code=${group.invite_code}`
    : "";

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const groupRow = await groupService.getGroup(groupId, user?.id);

      if (!groupRow) {
        setGroup(null);
        setMembers([]);
        setLeaderboard([]);
        setInvitations([]);
        return;
      }

      const [memberRows, leaderboardRows, invitationRows] = await Promise.all([
        groupService.getGroupMembers(groupId),
        groupService.getGroupLeaderboard(groupId),
        groupService.getGroupInvitations(groupId).catch(() => []),
      ]);

      setGroup(groupRow);
      setEditForm({
        name: groupRow.name,
        description: groupRow.description ?? "",
      });
      setMembers(memberRows);
      setLeaderboard(leaderboardRows);
      setInvitations(invitationRows);
    } catch (error) {
      setGroup(null);
      setMembers([]);
      setLeaderboard([]);
      setInvitations([]);
      toast.error(getSafeErrorMessage(error, "Could not load group."));
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadLivePredictions = useCallback(async () => {
    if (!group?.id || !group.live_predictions_enabled) {
      setLivePredictions([]);
      return;
    }

    setLivePredictionsLoading(true);

    try {
      const rows = await groupService.getLiveGroupPredictions(group.id);
      setLivePredictions(rows);
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not load group match predictions."),
      );
    } finally {
      setLivePredictionsLoading(false);
    }
  }, [group?.id, group?.live_predictions_enabled]);

  useEffect(() => {
    loadLivePredictions();

    const intervalId = window.setInterval(() => {
      loadLivePredictions();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadLivePredictions]);

  const copyInvite = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const searchProfiles = async (event) => {
    event.preventDefault();
    setSearching(true);

    try {
      setSearchResults(await groupService.searchProfiles(searchQuery, groupId));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not search users."));
    } finally {
      setSearching(false);
    }
  };

  const inviteProfile = async (profile) => {
    setInvitingId(profile.id);

    try {
      const invitation = await groupService.inviteMember({
        groupId,
        userId: profile.id,
        invitedBy: user.id,
      });

      toast.success(`Invitation sent to ${profile.username}.`);

      setSearchResults((current) =>
        current.filter((item) => item.id !== profile.id),
      );

      setInvitations((current) => [
        {
          ...invitation,
          invited_profile: profile,
        },
        ...current.filter((item) => item.invited_user_id !== profile.id),
      ]);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not send invitation."));
    } finally {
      setInvitingId(null);
    }
  };

  const updateLivePredictionsSetting = async (event) => {
    const enabled = event.target.checked;

    setLiveSettingBusy(true);

    try {
      const updatedGroup = await groupService.updateLivePredictionsEnabled({
        groupId,
        enabled,
      });

      setGroup((current) => ({
        ...current,
        ...updatedGroup,
      }));

      if (!enabled) {
        setLivePredictions([]);
      }

      toast.success(
        enabled
          ? "Group match predictions enabled."
          : "Group match predictions disabled.",
      );
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not update prediction setting."),
      );
    } finally {
      setLiveSettingBusy(false);
    }
  };

  const updateGroup = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const updated = await groupService.updateGroup({ groupId, ...editForm });
      setGroup(updated);
      toast.success("Group updated.");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not update group."));
    } finally {
      setSaving(false);
    }
  };

  const regenerateCode = async () => {
    setSaving(true);

    try {
      const updated = await groupService.regenerateInviteCode(groupId);
      setGroup(updated);
      toast.success("Invite code regenerated.");
    } catch (error) {
      toast.error(
        getSafeErrorMessage(error, "Could not regenerate invite code."),
      );
    } finally {
      setSaving(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;

    try {
      if (confirmAction.type === "remove") {
        await groupService.removeMember({
          groupId,
          userId: confirmAction.member.user_id,
        });
        toast.success("Member removed.");
        await load();
      }

      if (confirmAction.type === "leave") {
        await groupService.leaveGroup({ groupId, userId: user.id });
        toast.success("You left the group.");
        navigate("/groups");
      }

      if (confirmAction.type === "delete") {
        await groupService.deleteGroup(groupId);
        toast.success("Group deleted.");
        navigate("/groups");
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not complete action."));
    } finally {
      setConfirmAction(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading group" />;

  if (!group) {
    return (
      <main className="mx-auto grid min-h-[68vh] max-w-3xl place-items-center px-4 py-16 text-center sm:px-6 lg:px-8">
        <EmptyState
          title="Group not found"
          description="This group may not exist, or your account may not have access to it."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link
            to="/groups"
            className="text-sm font-bold text-emerald-300 hover:text-white"
          >
            Back to groups
          </Link>

          <p className="mt-5 text-sm font-black uppercase tracking-[0.32em] text-emerald-300">
            Private leaderboard
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">{group.name}</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            {group.description || "No description yet."}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Invite code
          </p>

          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-slate-950/70 px-3 py-2 font-mono text-lg font-black text-white">
              {group.invite_code}
            </code>

            <button
              type="button"
              onClick={() => copyInvite(group.invite_code, "Invite code")}
              className="rounded-full border border-white/15 p-2 text-white transition hover:bg-white/10"
              aria-label="Copy invite code"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      {leaderboard.length ? (
        <>
          <section className="mt-10">
            <TopThreePodium users={leaderboard} />
          </section>

          <section className="mt-8">
            <ScoreboardTable users={leaderboard} currentUserId={user?.id} />
          </section>
        </>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="No members on the board yet"
            description="Accepted group members will appear here."
          />
        </div>
      )}

      {group.live_predictions_enabled ? (
        <section className="mt-8 rounded-xl border border-emerald-300/20 bg-slate-950/72 p-5 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
                Group Match Predictions
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                Member picks for the next match
              </h2>
            </div>

            {livePredictionsLoading ? (
              <span className="text-sm font-bold text-slate-400">
                Refreshing...
              </span>
            ) : null}
          </div>

          {livePredictions.length ? (
            <div className="mt-5 space-y-5">
              {Object.values(
                livePredictions.reduce((groups, row) => {
                  if (!groups[row.match_id]) {
                    groups[row.match_id] = {
                      match: row,
                      predictions: [],
                    };
                  }

                  groups[row.match_id].predictions.push(row);
                  return groups;
                }, {}),
              ).map(({ match, predictions }) => (
                <GroupPredictionMatchCard
                  key={match.match_id}
                  match={match}
                  predictions={predictions}
                />
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Could not find a current group match to display. Check that the
              group has accepted members and that upcoming matches exist.
            </p>
          )}
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-white/10 bg-slate-950/72">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-2xl font-black">Members</h2>

            <p className="mt-2 text-sm text-slate-400">
              Only accepted members appear in this group leaderboard.
            </p>
          </div>

          <div className="divide-y divide-white/10">
            {members.map((member) => (
              <article key={member.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {member.profile.username}
                      </h3>

                      <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                        {member.role}
                      </span>

                      {member.user_id === user?.id ? (
                        <span className="rounded-full bg-emerald-300 px-2 py-1 text-[10px] font-black uppercase text-emerald-950">
                          You
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      Joined {formatDate(member.created_at)}
                    </p>
                  </div>

                  {canManage && member.user_id !== group.owner_id ? (
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction({ type: "remove", member })
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-300/40 px-4 py-2 text-sm font-bold text-rose-200 transition hover:bg-rose-300 hover:text-rose-950"
                    >
                      <UserMinus size={16} />
                      Remove
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          {canManage ? (
            <>
              <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-black text-white">
                  Invite friends
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Search existing users by username or email.
                </p>

                <form onSubmit={searchProfiles} className="mt-4 flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    maxLength={80}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                    placeholder="username or email"
                  />

                  <button
                    type="submit"
                    disabled={searching || searchQuery.trim().length < 2}
                    className="grid w-12 place-items-center rounded-lg bg-emerald-300 text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Search users"
                  >
                    <Search size={18} />
                  </button>
                </form>

                {searchResults.length ? (
                  <div className="mt-4 space-y-2">
                    {searchResults.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/60 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">
                            {profile.username}
                          </p>

                          <p className="truncate text-xs text-slate-400">
                            {profile.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={invitingId === profile.id}
                          onClick={() => inviteProfile(profile)}
                          className="rounded-full border border-emerald-300/40 px-3 py-2 text-xs font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:opacity-60"
                        >
                          {invitingId === profile.id ? "Sending..." : "Invite"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => copyInvite(inviteLink, "Invite link")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  <Copy size={16} />
                  Copy invite link
                </button>
              </section>

              <section className="rounded-lg border border-white/10 bg-slate-950/72 p-5">
                <h2 className="text-xl font-black text-white">
                  Pending invites
                </h2>

                {invitations.length ? (
                  <div className="mt-4 space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="rounded-lg bg-white/[0.04] p-3"
                      >
                        <p className="font-bold text-white">
                          {invitation.invited_profile?.username ??
                            "Invited user"}
                        </p>

                        <p className="text-xs text-slate-400">
                          Sent {formatDate(invitation.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No pending invites.
                  </p>
                )}
              </section>

              <form
                onSubmit={updateGroup}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5"
              >
                <h2 className="text-xl font-black text-white">
                  Group settings
                </h2>

                <label className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
                  <input
                    type="checkbox"
                    checked={Boolean(group.live_predictions_enabled)}
                    disabled={liveSettingBusy}
                    onChange={updateLivePredictionsSetting}
                    className="mt-1 h-5 w-5 rounded border-white/20 bg-slate-950 text-emerald-300"
                  />

                  <span>
                    <span className="block text-sm font-black text-white">
                      Reveal group match predictions
                    </span>

                    <span className="mt-1 block text-xs leading-5 text-slate-300">
                      Show member predictions for the next upcoming or live
                      match until it finishes.
                    </span>
                  </span>
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-bold text-slate-300">Name</span>

                  <input
                    required
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    maxLength={80}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-sm font-bold text-slate-300">
                    Description
                  </span>

                  <textarea
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    maxLength={500}
                    className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save settings"}
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={regenerateCode}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  <RefreshCw size={16} />
                  Regenerate invite code
                </button>
              </form>
            </>
          ) : null}

          <section className="rounded-lg border border-rose-300/30 bg-rose-300/10 p-5">
            <h2 className="text-xl font-black text-white">Danger zone</h2>

            {isOwner ? (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "delete" })}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-300 px-5 py-3 text-sm font-black text-rose-950 transition hover:bg-white"
              >
                <Trash2 size={16} />
                Delete group
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "leave" })}
                className="mt-4 w-full rounded-full border border-rose-300/40 px-5 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-300 hover:text-rose-950"
              >
                Leave group
              </button>
            )}
          </section>
        </aside>
      </section>

      {confirmAction ? (
        <ConfirmationModal
          title={getConfirmTitle(confirmAction)}
          description={getConfirmDescription(confirmAction)}
          confirmLabel={getConfirmLabel(confirmAction)}
          onCancel={() => setConfirmAction(null)}
          onConfirm={runConfirmedAction}
        />
      ) : null}
    </main>
  );
}

function GroupPredictionMatchCard({ match, predictions }) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/72 shadow-xl">
      <div className="bg-pitch-lines bg-[length:32px_32px] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge label={match.match_status} />

          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
            Group picks
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <GroupPredictionTeamName name={match.team_a} />

          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
            VS
          </span>

          <GroupPredictionTeamName name={match.team_b} align="right" />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-black text-white">
          {match.team_a_score ?? "-"} : {match.team_b_score ?? "-"}
          {match.elapsed !== null && match.elapsed !== undefined ? (
            <span className="ml-2 align-middle text-xs font-bold text-emerald-200">
              {match.elapsed} min
            </span>
          ) : match.status_detail ? (
            <span className="ml-2 align-middle text-xs font-bold text-emerald-200">
              {match.status_detail}
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <span className="flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-300" />
            {formatDateTime(match.match_date)}
          </span>

          <span className="flex items-center gap-2">
            <Trophy size={16} className="text-gold-300" />
            {match.stage ?? "Match"}
          </span>

          <span className="flex items-center gap-2 sm:col-span-2">
            <MapPin size={16} className="text-sky-300" />
            {[match.venue, match.city].filter(Boolean).join(", ") ||
              "Venue not set"}
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
          {predictions.map((prediction) => (
            <div
              key={`${prediction.match_id}-${prediction.user_id}`}
              className="grid gap-2 border-b border-white/10 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_1fr_auto]"
            >
              <p className="font-bold text-white">
                {prediction.username ?? "Unknown player"}
              </p>

              {prediction.predicted_result ? (
                <>
                  <p className="text-sm text-slate-300">
                    Pick: {getPredictionLabel(match, prediction.predicted_result)}
                  </p>

                  <p className="text-sm font-black text-emerald-200">
                    {getPredictedScoreLabel(prediction)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-400">No prediction yet</p>

                  <p className="text-sm font-black text-slate-500">-</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function GroupPredictionTeamName({ name, align = "left" }) {
  return (
    <div className={align === "right" ? "min-w-0 text-right" : "min-w-0"}>
      <TeamFlag
        className={align === "right" ? "mb-3 ml-auto" : "mb-3"}
        size="xl"
        teamName={name}
        variant="premium"
      />

      <h3 className="break-words text-lg font-black text-white sm:text-xl">
        {name}
      </h3>
    </div>
  );
}

function getConfirmTitle(action) {
  if (action.type === "remove") return "Remove member?";
  if (action.type === "leave") return "Leave group?";
  return "Delete group?";
}

function getConfirmDescription(action) {
  if (action.type === "remove") {
    return `${action.member.profile.username} will no longer appear in this group leaderboard.`;
  }

  if (action.type === "leave") {
    return "You will lose access to this private group unless someone invites you again.";
  }

  return "This permanently deletes the group, memberships, and pending invitations.";
}

function getConfirmLabel(action) {
  if (action.type === "remove") return "Remove member";
  if (action.type === "leave") return "Leave group";
  return "Delete group";
}
