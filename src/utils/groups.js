export const isAcceptedGroupMember = (members, userId) =>
  Boolean(userId) && (members ?? []).some((member) => member.user_id === userId && member.status === 'accepted');

export const canViewGroup = ({ group, members = [], userId }) =>
  Boolean(group?.id && userId) && (group.owner_id === userId || isAcceptedGroupMember(members, userId));

export const ownerMembershipForGroup = (group, createdAt = new Date().toISOString()) => ({
  id: `${group.id}:${group.owner_id}`,
  group_id: group.id,
  user_id: group.owner_id,
  role: 'owner',
  status: 'accepted',
  created_at: group.created_at ?? createdAt,
  updated_at: group.updated_at ?? createdAt,
});

export const mergeOwnedGroupsWithMembershipRows = (membershipGroups, ownedGroups, userId) => {
  const merged = new Map();

  (membershipGroups ?? []).forEach((group) => {
    if (group?.id) merged.set(group.id, group);
  });

  (ownedGroups ?? []).forEach((group) => {
    if (!group?.id || merged.has(group.id)) return;
    merged.set(group.id, {
      ...group,
      membership_role: 'owner',
      membership_status: 'accepted',
      membership_created_at: group.created_at,
      user_id: userId,
    });
  });

  return [...merged.values()].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
};
