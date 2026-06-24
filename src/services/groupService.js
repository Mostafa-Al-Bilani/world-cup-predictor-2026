import {
  canViewGroup,
  mergeOwnedGroupsWithMembershipRows,
  ownerMembershipForGroup,
} from "../utils/groups.js";
import { buildGroupMemberPredictionsByMatchId } from "../utils/groupPredictionRows.js";
import { sortLeaderboardUsers } from "../utils/leaderboard.js";
import {
  normalizeGroupInput,
  normalizeInviteCode,
  normalizeProfileSearchQuery,
  validateUuid,
} from "../utils/validation.js";
import { isDemoMode, supabase } from "./supabaseClient.js";
import { localStore } from "./localStore.js";

const createInviteCode = () =>
  crypto.randomUUID().slice(0, 8).replace(/-/g, "").toUpperCase();

const normalizeGroupRow = (membership) => ({
  ...membership.groups,
  membership_role: membership.role,
  membership_status: membership.status,
  membership_created_at: membership.created_at,
});

const attachProfilesToMembers = (members, profiles) =>
  members.map((member) => {
    const profile = profiles.find((item) => item.id === member.user_id) ?? {
      id: member.user_id,
      username: "Unknown player",
      total_points: 0,
      match_winner_points: 0,
      exact_score_points: 0,
      champion_points: 0,
      bracket_points: 0,
      correct_predictions: 0,
      total_predictions: 0,
    };

    return {
      ...member,
      profile: {
        ...profile,
      },
    };
  });

const readLocalGroups = (userId) => {
  const store = localStore.getStore();
  const membershipGroups = store.groupMembers
    .filter(
      (member) => member.user_id === userId && member.status === "accepted",
    )
    .map((member) => {
      const group = store.groups.find((item) => item.id === member.group_id);
      return group
        ? {
            ...group,
            membership_role: member.role,
            membership_status: member.status,
          }
        : null;
    })
    .filter(Boolean);
  const ownedGroups = store.groups.filter((group) => group.owner_id === userId);
  return mergeOwnedGroupsWithMembershipRows(
    membershipGroups,
    ownedGroups,
    userId,
  );
};

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error("You must be logged in to use groups.");
  }
  return data.user.id;
};

export const groupService = {
  async getMyGroups(userId) {
    if (!userId) return [];
    if (isDemoMode) return readLocalGroups(validateUuid(userId, "User ID"));

    const currentUserId = await getCurrentUserId();
    const { data: membershipRows, error } = await supabase
      .from("group_members")
      .select(
        "role,status,created_at,groups(id,name,description,owner_id,invite_code,live_predictions_enabled,created_at,updated_at)",
      )
      .eq("user_id", currentUserId)
      .eq("status", "accepted")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const membershipGroups = (membershipRows ?? [])
      .map(normalizeGroupRow)
      .filter((group) => group.id);

    const { data: ownedGroups, error: ownedError } = await supabase
      .from("groups")
      .select(
        "id,name,description,owner_id,invite_code,live_predictions_enabled,created_at,updated_at",
      )
      .eq("owner_id", currentUserId)
      .order("created_at", { ascending: false });

    if (ownedError) throw ownedError;
    return mergeOwnedGroupsWithMembershipRows(
      membershipGroups,
      ownedGroups ?? [],
      currentUserId,
    );
  },

  async getPendingInvitations(userId) {
    if (!userId) return [];

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();

      return store.groupInvitations
        .filter(
          (invite) =>
            invite.invited_user_id === normalizedUserId &&
            invite.status === "pending",
        )
        .map((invite) => ({
          ...invite,
          group: store.groups.find((group) => group.id === invite.group_id),
        }))
        .filter((invite) => invite.group);
    }

    const currentUserId = await getCurrentUserId();

    const { data: invites, error } = await supabase
      .from("group_invitations")
      .select(
        "id,group_id,invited_user_id,invited_by,status,created_at,updated_at",
      )
      .eq("invited_user_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!invites?.length) return [];

    const groupIds = [...new Set(invites.map((invite) => invite.group_id))];

    const { data: groups, error: groupError } = await supabase
      .from("groups")
      .select("id,name,description,owner_id,invite_code,created_at,updated_at")
      .in("id", groupIds);

    if (groupError) throw groupError;

    return invites
      .map((invite) => ({
        ...invite,
        group: groups?.find((group) => group.id === invite.group_id),
      }))
      .filter((invite) => invite.group);
  },

  async createGroup({ name, description, userId }) {
    const normalizedInput = normalizeGroupInput({ name, description });

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();
      const group = {
        id: crypto.randomUUID(),
        name: normalizedInput.name,
        description: normalizedInput.description,
        owner_id: normalizedUserId,
        invite_code: createInviteCode(),
        live_predictions_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const member = {
        id: crypto.randomUUID(),
        group_id: group.id,
        user_id: normalizedUserId,
        role: "owner",
        status: "accepted",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStore.setStore({
        ...store,
        groups: [group, ...store.groups],
        groupMembers: [member, ...store.groupMembers],
      });
      return group;
    }

    const { data, error } = await supabase.rpc("create_private_group", {
      group_name: normalizedInput.name,
      group_description: normalizedInput.description,
    });
    if (error) throw error;
    return data;
  },

  async joinByCode({ code, userId }) {
    const normalizedCode = normalizeInviteCode(code);

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();
      const group = store.groups.find(
        (item) => item.invite_code?.toUpperCase() === normalizedCode,
      );
      if (!group) throw new Error("Invalid invite code.");
      if (
        !store.groupMembers.some(
          (member) =>
            member.group_id === group.id && member.user_id === normalizedUserId,
        )
      ) {
        store.groupMembers.unshift({
          id: crypto.randomUUID(),
          group_id: group.id,
          user_id: normalizedUserId,
          role: "member",
          status: "accepted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      localStore.setStore(store);
      return group;
    }

    const { data, error } = await supabase.rpc("join_group_by_invite_code", {
      target_invite_code: normalizedCode,
    });
    if (error) throw error;
    return data;
  },

  async respondInvitation({ invitationId, status, userId }) {
    const normalizedInvitationId = validateUuid(invitationId, "Invitation ID");
    if (!["accepted", "declined"].includes(status)) {
      throw new Error("Invitation response is invalid.");
    }

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();
      const invitation = store.groupInvitations.find(
        (item) =>
          item.id === normalizedInvitationId &&
          item.invited_user_id === normalizedUserId,
      );
      if (!invitation) throw new Error("Invitation not found.");
      invitation.status = status;
      invitation.updated_at = new Date().toISOString();
      if (
        status === "accepted" &&
        !store.groupMembers.some(
          (item) =>
            item.group_id === invitation.group_id &&
            item.user_id === normalizedUserId,
        )
      ) {
        store.groupMembers.push({
          id: crypto.randomUUID(),
          group_id: invitation.group_id,
          user_id: normalizedUserId,
          role: "member",
          status: "accepted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      localStore.setStore(store);
      return invitation;
    }

    const { data, error } = await supabase.rpc("respond_group_invitation", {
      target_invitation_id: normalizedInvitationId,
      response_status: status,
    });
    if (error) throw error;
    return data;
  },

  async getGroup(groupId, userId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();
      const group =
        store.groups.find((item) => item.id === normalizedGroupId) ?? null;
      const members = store.groupMembers.filter(
        (member) => member.group_id === normalizedGroupId,
      );
      return canViewGroup({ group, members, userId: normalizedUserId })
        ? group
        : null;
    }

    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", normalizedGroupId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getGroupMembers(groupId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    if (isDemoMode) {
      const store = localStore.getStore();
      const group = store.groups.find((item) => item.id === normalizedGroupId);
      const members = store.groupMembers.filter(
        (member) =>
          member.group_id === normalizedGroupId && member.status === "accepted",
      );
      if (
        group?.owner_id &&
        !members.some((member) => member.user_id === group.owner_id)
      ) {
        members.unshift(ownerMembershipForGroup(group));
      }
      return attachProfilesToMembers(members, store.profiles);
    }

    const { data: members, error } = await supabase
      .from("group_members")
      .select("id,group_id,user_id,role,status,created_at,updated_at")
      .eq("group_id", normalizedGroupId)
      .eq("status", "accepted")
      .order("created_at", { ascending: true });

    if (error) throw error;
    const userIds = (members ?? []).map((member) => member.user_id);
    if (!userIds.length) return [];

    const { data: profiles, error: profileError } = await supabase
      .from("leaderboard_profiles")
      .select(
        "id,username,total_points,match_winner_points,exact_score_points,champion_points,bracket_points,correct_predictions,total_predictions,created_at",
      )
      .in("id", userIds);

    if (profileError) throw profileError;
    return attachProfilesToMembers(members ?? [], profiles ?? []);
  },

  async getGroupLeaderboard(groupId) {
    const members = await this.getGroupMembers(groupId);
    return sortLeaderboardUsers(
      members.map((member) => ({ ...member.profile, role: member.role })),
    );
  },

  async getGroupInvitations(groupId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.groupInvitations
        .filter(
          (invite) =>
            invite.group_id === normalizedGroupId &&
            invite.status === "pending",
        )
        .map((invite) => ({
          ...invite,
          invited_profile: store.profiles.find(
            (profile) => profile.id === invite.invited_user_id,
          ),
        }));
    }

    const { data: invites, error } = await supabase
      .from("group_invitations")
      .select(
        "id,group_id,invited_user_id,invited_by,status,created_at,updated_at",
      )
      .eq("group_id", normalizedGroupId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const userIds = (invites ?? []).map((invite) => invite.invited_user_id);
    if (!userIds.length) return [];

    const { data: profiles, error: profileError } = await supabase
      .from("leaderboard_profiles")
      .select(
        "id,username,total_points,match_winner_points,exact_score_points,champion_points,bracket_points,correct_predictions,total_predictions,created_at",
      )
      .in("id", userIds);

    if (profileError) throw profileError;
    return invites.map((invite) => ({
      ...invite,
      invited_profile: profiles.find(
        (profile) => profile.id === invite.invited_user_id,
      ),
    }));
  },

  async searchProfiles(query, groupId) {
    const normalizedQuery = normalizeProfileSearchQuery(query);

    if (isDemoMode) {
      const normalized = normalizedQuery.toLowerCase();
      const store = localStore.getStore();
      return store.profiles
        .filter(
          (profile) =>
            profile.username.toLowerCase().includes(normalized) ||
            profile.email.toLowerCase().includes(normalized),
        )
        .slice(0, 10);
    }

    const normalizedGroupId = validateUuid(groupId, "Group ID");
    const { data, error } = await supabase.rpc("search_profiles_for_invite", {
      target_group_id: normalizedGroupId,
      search_text: normalizedQuery,
    });
    if (error) throw error;
    return data ?? [];
  },

  async inviteMember({ groupId, userId, invitedBy }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    const normalizedUserId = validateUuid(userId, "User ID");

    if (isDemoMode) {
      const normalizedInviterId = validateUuid(invitedBy, "Inviter ID");
      const store = localStore.getStore();
      const invitation = {
        id: crypto.randomUUID(),
        group_id: normalizedGroupId,
        invited_user_id: normalizedUserId,
        invited_by: normalizedInviterId,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const invitations = store.groupInvitations.filter(
        (item) =>
          !(
            item.group_id === normalizedGroupId &&
            item.invited_user_id === normalizedUserId
          ),
      );
      localStore.setStore({
        ...store,
        groupInvitations: [invitation, ...invitations],
      });
      return invitation;
    }

    const { data, error } = await supabase.rpc("invite_group_member", {
      target_group_id: normalizedGroupId,
      target_user_id: normalizedUserId,
    });
    if (error) throw error;
    return data;
  },

  async updateGroup({ groupId, name, description }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    const normalizedInput = normalizeGroupInput({ name, description });

    if (isDemoMode) {
      const store = localStore.getStore();
      const groups = store.groups.map((group) =>
        group.id === normalizedGroupId
          ? {
              ...group,
              name: normalizedInput.name,
              description: normalizedInput.description,
              updated_at: new Date().toISOString(),
            }
          : group,
      );
      localStore.setStore({ ...store, groups });
      return groups.find((group) => group.id === normalizedGroupId);
    }

    const { data, error } = await supabase.rpc("update_group_details", {
      target_group_id: normalizedGroupId,
      group_name: normalizedInput.name,
      group_description: normalizedInput.description,
    });
    if (error) throw error;
    return data;
  },

  async regenerateInviteCode(groupId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    if (isDemoMode) {
      const store = localStore.getStore();
      const groups = store.groups.map((group) =>
        group.id === normalizedGroupId
          ? {
              ...group,
              invite_code: createInviteCode(),
              updated_at: new Date().toISOString(),
            }
          : group,
      );
      localStore.setStore({ ...store, groups });
      return groups.find((group) => group.id === normalizedGroupId);
    }

    const { data, error } = await supabase.rpc("regenerate_group_invite_code", {
      target_group_id: normalizedGroupId,
    });
    if (error) throw error;
    return data;
  },

  async removeMember({ groupId, userId }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    const normalizedUserId = validateUuid(userId, "User ID");

    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groupMembers: store.groupMembers.filter(
          (member) =>
            !(
              member.group_id === normalizedGroupId &&
              member.user_id === normalizedUserId
            ),
        ),
      });
      return;
    }

    const { error } = await supabase.rpc("remove_group_member", {
      target_group_id: normalizedGroupId,
      target_user_id: normalizedUserId,
    });
    if (error) throw error;
  },

  async leaveGroup({ groupId, userId }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groupMembers: store.groupMembers.filter(
          (member) =>
            !(
              member.group_id === normalizedGroupId &&
              member.user_id === normalizedUserId
            ),
        ),
      });
      return;
    }

    const { error } = await supabase.rpc("leave_group", {
      target_group_id: normalizedGroupId,
    });
    if (error) throw error;
  },

  async deleteGroup(groupId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groups: store.groups.filter((group) => group.id !== normalizedGroupId),
        groupMembers: store.groupMembers.filter(
          (member) => member.group_id !== normalizedGroupId,
        ),
        groupInvitations: store.groupInvitations.filter(
          (invite) => invite.group_id !== normalizedGroupId,
        ),
      });
      return;
    }

    const { error } = await supabase.rpc("delete_private_group", {
      target_group_id: normalizedGroupId,
    });
    if (error) throw error;
  },
  async updateLivePredictionsEnabled({ groupId, enabled }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");

    if (isDemoMode) {
      const store = localStore.getStore();
      const groups = store.groups.map((group) =>
        group.id === normalizedGroupId
          ? {
              ...group,
              live_predictions_enabled: Boolean(enabled),
              updated_at: new Date().toISOString(),
            }
          : group,
      );

      localStore.setStore({ ...store, groups });
      return groups.find((group) => group.id === normalizedGroupId);
    }

    const { data, error } = await supabase.rpc(
      "update_group_live_predictions_setting",
      {
        target_group_id: normalizedGroupId,
        enabled: Boolean(enabled),
      },
    );

    if (error) throw error;
    return data;
  },

  async getLiveGroupPredictions(groupId) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");

    if (isDemoMode) {
      return [];
    }

    const { data, error } = await supabase.rpc("get_live_group_predictions", {
      target_group_id: normalizedGroupId,
    });

    if (error) throw error;
    return data ?? [];
  },

  async getGroupPredictionsForMatches({ groupId, matchIds, members = [] }) {
    const normalizedGroupId = validateUuid(groupId, "Group ID");
    const normalizedMatchIds = (matchIds ?? []).map((matchId) =>
      validateUuid(matchId, "Match ID"),
    );

    if (!normalizedMatchIds.length) {
      return {};
    }

    const memberUserIds = [...members]
      .filter((member) => member.status === "accepted")
      .map((member) => member.user_id);

    if (isDemoMode) {
      const store = localStore.getStore();
      const predictionRows = store.predictions.filter(
        (prediction) =>
          normalizedMatchIds.includes(prediction.match_id) &&
          memberUserIds.includes(prediction.user_id),
      );

      return buildGroupMemberPredictionsByMatchId({
        members,
        matchIds: normalizedMatchIds,
        predictionRows,
      });
    }

    const { data, error } = await supabase.rpc(
      "get_group_predictions_for_matches",
      {
        target_group_id: normalizedGroupId,
        target_match_ids: normalizedMatchIds,
      },
    );

    if (error) throw error;

    return buildGroupMemberPredictionsByMatchId({
      members,
      matchIds: normalizedMatchIds,
      predictionRows: data ?? [],
    });
  },
};
