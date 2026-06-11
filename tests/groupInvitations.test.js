import assert from "node:assert/strict";
import test from "node:test";

const ownerId = "11111111-1111-4111-8111-111111111111";
const invitedUserId = "22222222-2222-4222-8222-222222222222";
const groupId = "33333333-3333-4333-8333-333333333333";

const createInvitation = ({ groupId, invitedUserId, invitedBy }) => ({
  id: "55555555-5555-4555-8555-555555555555",
  group_id: groupId,
  invited_user_id: invitedUserId,
  invited_by: invitedBy,
  status: "pending",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const acceptInvitation = ({ invitation, members }) => {
  const acceptedInvitation = {
    ...invitation,
    status: "accepted",
    updated_at: new Date().toISOString(),
  };

  const alreadyMember = members.some(
    (member) =>
      member.group_id === invitation.group_id &&
      member.user_id === invitation.invited_user_id,
  );

  const nextMembers = alreadyMember
    ? members
    : [
        ...members,
        {
          id: "66666666-6666-4666-8666-666666666666",
          group_id: invitation.group_id,
          user_id: invitation.invited_user_id,
          role: "member",
          status: "accepted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

  return {
    invitation: acceptedInvitation,
    members: nextMembers,
  };
};

test("group invite is created as a pending invitation for the selected user", () => {
  const invitation = createInvitation({
    groupId,
    invitedUserId,
    invitedBy: ownerId,
  });

  assert.equal(invitation.group_id, groupId);
  assert.equal(invitation.invited_user_id, invitedUserId);
  assert.equal(invitation.invited_by, ownerId);
  assert.equal(invitation.status, "pending");
});

test("accepting a group invitation adds the invited user as a member", () => {
  const invitation = createInvitation({
    groupId,
    invitedUserId,
    invitedBy: ownerId,
  });

  const members = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      group_id: groupId,
      user_id: ownerId,
      role: "owner",
      status: "accepted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const result = acceptInvitation({ invitation, members });

  assert.equal(result.invitation.status, "accepted");

  const invitedMember = result.members.find(
    (member) => member.user_id === invitedUserId,
  );

  assert.ok(invitedMember);
  assert.equal(invitedMember.group_id, groupId);
  assert.equal(invitedMember.role, "member");
  assert.equal(invitedMember.status, "accepted");
});