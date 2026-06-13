import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { groupService } from '../services/groupService';
import { formatDate } from '../utils/date';
import { getSafeErrorMessage } from '../utils/errors';

const blankGroup = {
  name: '',
  description: '',
};

export function GroupsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [groupForm, setGroupForm] = useState(blankGroup);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [groupRows, inviteRows] = await Promise.all([
        groupService.getMyGroups(user.id),
        groupService.getPendingInvitations(user.id),
      ]);
      setGroups(groupRows);
      setInvitations(inviteRows);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not load groups.'));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setInviteCode(code.toUpperCase());
  }, [searchParams]);

  const createGroup = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const group = await groupService.createGroup({ ...groupForm, userId: user.id });
      toast.success('Group created.');
      setGroupForm(blankGroup);
      navigate(`/groups/${group.id}`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not create group.'));
    } finally {
      setSaving(false);
    }
  };

  const joinGroup = async (event) => {
    event.preventDefault();
    setJoining(true);
    try {
      const group = await groupService.joinByCode({ code: inviteCode, userId: user.id });
      toast.success('Joined group.');
      setInviteCode('');
      navigate(`/groups/${group.id}`);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not join group.'));
    } finally {
      setJoining(false);
    }
  };

  const respond = async (invitation, status) => {
    setRespondingId(invitation.id);
    try {
      await groupService.respondInvitation({ invitationId: invitation.id, status, userId: user.id });
      toast.success(status === 'accepted' ? 'Invitation accepted.' : 'Invitation declined.');
      await load();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, 'Could not update invitation.'));
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading groups" />;

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.32em] text-emerald-300">Private leagues</p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Groups</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Create private prediction groups, invite friends, and compare scores inside your own leaderboard.
          </p>
        </div>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {invitations.length ? (
            <section className="rounded-lg border border-gold-300/30 bg-gold-300/10 p-5">
              <h2 className="text-2xl font-black text-white">Pending invitations</h2>
              <div className="mt-4 grid gap-3">
                {invitations.map((invitation) => (
                  <article key={invitation.id} className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-black text-white">{invitation.group.name}</h3>
                        <p className="mt-1 text-sm text-slate-300">
                          Invited {formatDate(invitation.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={respondingId === invitation.id}
                          onClick={() => respond(invitation, 'accepted')}
                          className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-black text-emerald-950 transition hover:bg-white disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={respondingId === invitation.id}
                          onClick={() => respond(invitation, 'declined')}
                          className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {groups.length ? (
            <section className="grid gap-4 md:grid-cols-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="rounded-lg border border-white/10 bg-slate-950/72 p-5 shadow-xl transition hover:-translate-y-1 hover:border-emerald-300/40"
                >
                  <span className="inline-grid h-12 w-12 place-items-center rounded-lg border border-emerald-300/30 bg-emerald-300/10 text-emerald-200">
                    <Users size={22} />
                  </span>
                  <h2 className="mt-4 text-2xl font-black text-white">{group.name}</h2>
                  <p className="mt-2 min-h-10 text-sm text-slate-300">
                    {group.description || 'No description yet.'}
                  </p>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {group.membership_role === 'owner' ? 'Owner' : 'Member'}
                  </p>
                </Link>
              ))}
            </section>
          ) : (
            <EmptyState
              title="No groups yet"
              description="Create a group or join one with an invite code to start a private leaderboard."
            />
          )}
        </div>

        <aside className="space-y-6">
          <form onSubmit={createGroup} className="rounded-lg border border-white/10 bg-slate-950/72 p-5">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-emerald-300" />
              <h2 className="text-xl font-black text-white">Create group</h2>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-300">Group name</span>
              <input
                required
                value={groupForm.name}
                onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                maxLength={80}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                placeholder="Office bracket"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-slate-300">Description</span>
              <textarea
                value={groupForm.description}
                onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))}
                maxLength={500}
                className="mt-2 min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
                placeholder="For friends, coworkers, or family."
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create group'}
            </button>
          </form>

          <form onSubmit={joinGroup} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-black text-white">Join by code</h2>
            <p className="mt-2 text-sm text-slate-300">Paste an invite code from a group owner.</p>
            <input
              required
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              maxLength={8}
              pattern="[A-Fa-f0-9]{8}"
              aria-label="Group invite code"
              className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white outline-none focus:border-emerald-300"
              placeholder="A1B2C3D4"
            />
            <button
              type="submit"
              disabled={joining}
              className="mt-5 w-full rounded-full border border-emerald-300/40 px-5 py-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-300 hover:text-emerald-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {joining ? 'Joining...' : 'Join group'}
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}
