import { getAccuracy } from '../utils/predictions';
import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';

const sortLeaderboard = (players) =>
  [...players].sort((a, b) => {
    if ((b.total_points ?? 0) !== (a.total_points ?? 0)) return (b.total_points ?? 0) - (a.total_points ?? 0);
    if ((b.correct_predictions ?? 0) !== (a.correct_predictions ?? 0)) {
      return (b.correct_predictions ?? 0) - (a.correct_predictions ?? 0);
    }
    return a.username.localeCompare(b.username);
  });

const createInviteCode = () => crypto.randomUUID().slice(0, 8).replace(/-/g, '').toUpperCase();

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
      username: 'Unknown player',
      total_points: 0,
      correct_predictions: 0,
      total_predictions: 0,
    };

    return {
      ...member,
      profile: {
        ...profile,
        accuracy: getAccuracy(profile),
      },
    };
  });

const readLocalGroups = (userId) => {
  const store = localStore.getStore();
  return store.groupMembers
    .filter((member) => member.user_id === userId && member.status === 'accepted')
    .map((member) => {
      const group = store.groups.find((item) => item.id === member.group_id);
      return group ? { ...group, membership_role: member.role, membership_status: member.status } : null;
    })
    .filter(Boolean);
};

export const groupService = {
  async getMyGroups(userId) {
    if (!userId) return [];
    if (isDemoMode) return readLocalGroups(userId);

    const { data, error } = await supabase
      .from('group_members')
      .select('role,status,created_at,groups(id,name,description,owner_id,invite_code,created_at,updated_at)')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(normalizeGroupRow).filter((group) => group.id);
  },

  async getPendingInvitations(userId) {
    if (!userId) return [];
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.groupInvitations
        .filter((invite) => invite.invited_user_id === userId && invite.status === 'pending')
        .map((invite) => ({ ...invite, group: store.groups.find((group) => group.id === invite.group_id) }))
        .filter((invite) => invite.group);
    }

    const { data, error } = await supabase
      .from('group_invitations')
      .select('id,group_id,invited_user_id,invited_by,status,created_at,updated_at,groups(id,name,description,owner_id,invite_code)')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((invite) => ({ ...invite, group: invite.groups })).filter((invite) => invite.group);
  },

  async createGroup({ name, description, userId }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const group = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: userId,
        invite_code: createInviteCode(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const member = {
        id: crypto.randomUUID(),
        group_id: group.id,
        user_id: userId,
        role: 'owner',
        status: 'accepted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStore.setStore({ ...store, groups: [group, ...store.groups], groupMembers: [member, ...store.groupMembers] });
      return group;
    }

    const { data, error } = await supabase.rpc('create_private_group', {
      group_name: name,
      group_description: description || null,
    });
    if (error) throw error;
    return data;
  },

  async joinByCode({ code, userId }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const group = store.groups.find((item) => item.invite_code?.toUpperCase() === code.trim().toUpperCase());
      if (!group) throw new Error('Invalid invite code.');
      if (!store.groupMembers.some((member) => member.group_id === group.id && member.user_id === userId)) {
        store.groupMembers.unshift({
          id: crypto.randomUUID(),
          group_id: group.id,
          user_id: userId,
          role: 'member',
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      localStore.setStore(store);
      return group;
    }

    const { data, error } = await supabase.rpc('join_group_by_invite_code', { target_invite_code: code });
    if (error) throw error;
    return data;
  },

  async respondInvitation({ invitationId, status, userId }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const invitation = store.groupInvitations.find((item) => item.id === invitationId && item.invited_user_id === userId);
      if (!invitation) throw new Error('Invitation not found.');
      invitation.status = status;
      invitation.updated_at = new Date().toISOString();
      if (status === 'accepted' && !store.groupMembers.some((item) => item.group_id === invitation.group_id && item.user_id === userId)) {
        store.groupMembers.push({
          id: crypto.randomUUID(),
          group_id: invitation.group_id,
          user_id: userId,
          role: 'member',
          status: 'accepted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      localStore.setStore(store);
      return invitation;
    }

    const { data, error } = await supabase.rpc('respond_group_invitation', {
      target_invitation_id: invitationId,
      response_status: status,
    });
    if (error) throw error;
    return data;
  },

  async getGroup(groupId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.groups.find((group) => group.id === groupId) ?? null;
    }

    const { data, error } = await supabase.from('groups').select('*').eq('id', groupId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getGroupMembers(groupId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const members = store.groupMembers.filter((member) => member.group_id === groupId && member.status === 'accepted');
      return attachProfilesToMembers(members, store.profiles);
    }

    const { data: members, error } = await supabase
      .from('group_members')
      .select('id,group_id,user_id,role,status,created_at,updated_at')
      .eq('group_id', groupId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: true });

    if (error) throw error;
    const userIds = (members ?? []).map((member) => member.user_id);
    if (!userIds.length) return [];

    const { data: profiles, error: profileError } = await supabase
      .from('leaderboard_profiles')
      .select('id,username,total_points,correct_predictions,total_predictions,created_at')
      .in('id', userIds);

    if (profileError) throw profileError;
    return attachProfilesToMembers(members ?? [], profiles ?? []);
  },

  async getGroupLeaderboard(groupId) {
    const members = await this.getGroupMembers(groupId);
    return sortLeaderboard(members.map((member) => ({ ...member.profile, role: member.role })));
  },

  async getGroupInvitations(groupId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.groupInvitations
        .filter((invite) => invite.group_id === groupId && invite.status === 'pending')
        .map((invite) => ({
          ...invite,
          invited_profile: store.profiles.find((profile) => profile.id === invite.invited_user_id),
        }));
    }

    const { data: invites, error } = await supabase
      .from('group_invitations')
      .select('id,group_id,invited_user_id,invited_by,status,created_at,updated_at')
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const userIds = (invites ?? []).map((invite) => invite.invited_user_id);
    if (!userIds.length) return [];

    const { data: profiles, error: profileError } = await supabase
      .from('leaderboard_profiles')
      .select('id,username,total_points,correct_predictions,total_predictions,created_at')
      .in('id', userIds);

    if (profileError) throw profileError;
    return invites.map((invite) => ({
      ...invite,
      invited_profile: profiles.find((profile) => profile.id === invite.invited_user_id),
    }));
  },

  async searchProfiles(query) {
    if (isDemoMode) {
      const normalized = query.trim().toLowerCase();
      if (normalized.length < 2) return [];
      const store = localStore.getStore();
      return store.profiles
        .filter((profile) => profile.username.toLowerCase().includes(normalized) || profile.email.toLowerCase().includes(normalized))
        .slice(0, 10);
    }

    const { data, error } = await supabase.rpc('search_profiles_for_invite', { search_text: query });
    if (error) throw error;
    return data ?? [];
  },

  async inviteMember({ groupId, userId, invitedBy }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const invitation = {
        id: crypto.randomUUID(),
        group_id: groupId,
        invited_user_id: userId,
        invited_by: invitedBy,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const invitations = store.groupInvitations.filter(
        (item) => !(item.group_id === groupId && item.invited_user_id === userId),
      );
      localStore.setStore({ ...store, groupInvitations: [invitation, ...invitations] });
      return invitation;
    }

    const { data, error } = await supabase.rpc('invite_group_member', {
      target_group_id: groupId,
      target_user_id: userId,
    });
    if (error) throw error;
    return data;
  },

  async updateGroup({ groupId, name, description }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const groups = store.groups.map((group) =>
        group.id === groupId ? { ...group, name, description: description || null, updated_at: new Date().toISOString() } : group,
      );
      localStore.setStore({ ...store, groups });
      return groups.find((group) => group.id === groupId);
    }

    const { data, error } = await supabase.rpc('update_group_details', {
      target_group_id: groupId,
      group_name: name,
      group_description: description || null,
    });
    if (error) throw error;
    return data;
  },

  async regenerateInviteCode(groupId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const groups = store.groups.map((group) =>
        group.id === groupId ? { ...group, invite_code: createInviteCode(), updated_at: new Date().toISOString() } : group,
      );
      localStore.setStore({ ...store, groups });
      return groups.find((group) => group.id === groupId);
    }

    const { data, error } = await supabase.rpc('regenerate_group_invite_code', { target_group_id: groupId });
    if (error) throw error;
    return data;
  },

  async removeMember({ groupId, userId }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groupMembers: store.groupMembers.filter((member) => !(member.group_id === groupId && member.user_id === userId)),
      });
      return;
    }

    const { error } = await supabase.rpc('remove_group_member', {
      target_group_id: groupId,
      target_user_id: userId,
    });
    if (error) throw error;
  },

  async leaveGroup({ groupId, userId }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groupMembers: store.groupMembers.filter((member) => !(member.group_id === groupId && member.user_id === userId)),
      });
      return;
    }

    const { error } = await supabase.rpc('leave_group', { target_group_id: groupId });
    if (error) throw error;
  },

  async deleteGroup(groupId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.setStore({
        ...store,
        groups: store.groups.filter((group) => group.id !== groupId),
        groupMembers: store.groupMembers.filter((member) => member.group_id !== groupId),
        groupInvitations: store.groupInvitations.filter((invite) => invite.group_id !== groupId),
      });
      return;
    }

    const { error } = await supabase.rpc('delete_private_group', { target_group_id: groupId });
    if (error) throw error;
  },
};
