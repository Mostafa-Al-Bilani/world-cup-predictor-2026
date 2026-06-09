create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  total_points integer not null default 0,
  correct_predictions integer not null default 0,
  total_predictions integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number integer unique,
  team_a text not null,
  team_b text not null,
  match_date timestamptz not null,
  stage text not null,
  status text not null default 'upcoming',
  team_a_score integer,
  team_b_score integer,
  result text,
  venue text,
  city text,
  host_country text,
  external_ref text,
  api_slug text,
  provider_name text,
  provider_fixture_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  constraint matches_status_check check (status in ('upcoming', 'live', 'finished')),
  constraint matches_result_check check (result is null or result in ('team_a', 'draw', 'team_b')),
  constraint matches_scores_non_negative check (
    (team_a_score is null or team_a_score >= 0) and
    (team_b_score is null or team_b_score >= 0)
  )
);

alter table public.matches add column if not exists provider_name text;
alter table public.matches add column if not exists provider_fixture_id text;
alter table public.matches add column if not exists last_synced_at timestamptz;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_result text not null,
  is_correct boolean,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_result_check check (predicted_result in ('team_a', 'draw', 'team_b')),
  constraint predictions_points_check check (points_awarded in (0, 1)),
  constraint predictions_unique_user_match unique (user_id, match_id)
);

create index if not exists matches_match_date_idx on public.matches(match_date);
create index if not exists matches_status_idx on public.matches(status);
create unique index if not exists matches_external_ref_unique_idx
on public.matches(external_ref)
where external_ref is not null;
create unique index if not exists matches_provider_fixture_unique_idx
on public.matches(provider_name, provider_fixture_id)
where provider_name is not null and provider_fixture_id is not null;
create index if not exists predictions_user_id_idx on public.predictions(user_id);
create index if not exists predictions_match_id_idx on public.predictions(match_id);
create index if not exists profiles_score_idx on public.profiles(total_points desc, correct_predictions desc);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  fallback_used boolean not null default false,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  recalculated_count integer not null default 0,
  failed_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  constraint sync_logs_status_check check (status in ('success', 'error'))
);

create index if not exists sync_logs_created_at_idx on public.sync_logs(created_at desc);
create index if not exists sync_logs_status_idx on public.sync_logs(status, created_at desc);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'accepted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_members_role_check check (role in ('owner', 'admin', 'member')),
  constraint group_members_status_check check (status in ('accepted')),
  constraint group_members_unique_user unique (group_id, user_id)
);

create table if not exists public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_invitations_status_check check (status in ('pending', 'accepted', 'declined')),
  constraint group_invitations_unique_user unique (group_id, invited_user_id)
);

alter table public.groups add column if not exists description text;
alter table public.groups add column if not exists invite_code text;
alter table public.groups add column if not exists updated_at timestamptz not null default now();
alter table public.group_members add column if not exists updated_at timestamptz not null default now();
alter table public.group_invitations add column if not exists updated_at timestamptz not null default now();

create unique index if not exists groups_invite_code_unique_idx
on public.groups(invite_code)
where invite_code is not null;
create index if not exists groups_owner_id_idx on public.groups(owner_id);
create index if not exists group_members_group_id_idx on public.group_members(group_id);
create index if not exists group_members_user_id_idx on public.group_members(user_id);
create index if not exists group_members_status_idx on public.group_members(status);
create index if not exists group_invitations_group_id_idx on public.group_invitations(group_id);
create index if not exists group_invitations_invited_user_id_idx on public.group_invitations(invited_user_id);
create index if not exists group_invitations_status_idx on public.group_invitations(status);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id
      and is_admin = true
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_prediction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_prediction_updated_at();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists group_members_set_updated_at on public.group_members;
create trigger group_members_set_updated_at
before update on public.group_members
for each row execute function public.set_updated_at();

drop trigger if exists group_invitations_set_updated_at on public.group_invitations;
create trigger group_invitations_set_updated_at
before update on public.group_invitations
for each row execute function public.set_updated_at();

create or replace function public.prevent_locked_prediction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starts_at timestamptz;
  current_status text;
begin
  select match_date, status into starts_at, current_status
  from public.matches
  where id = new.match_id;

  if starts_at <= now() or current_status <> 'upcoming' then
    raise exception 'Predictions are locked after match kickoff';
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_prevent_locked_insert on public.predictions;
create trigger predictions_prevent_locked_insert
before insert on public.predictions
for each row execute function public.prevent_locked_prediction_change();

drop trigger if exists predictions_prevent_locked_update on public.predictions;
create trigger predictions_prevent_locked_update
before update of predicted_result on public.predictions
for each row execute function public.prevent_locked_prediction_change();

create or replace function public.recalculate_profile_totals(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    total_points = coalesce(summary.total_points, 0),
    correct_predictions = coalesce(summary.correct_predictions, 0),
    total_predictions = coalesce(summary.total_predictions, 0)
  from (
    select
      target_user_id as user_id,
      coalesce(sum(points_awarded), 0)::integer as total_points,
      count(*) filter (where is_correct = true)::integer as correct_predictions,
      count(*)::integer as total_predictions
    from public.predictions
    where user_id = target_user_id
  ) summary
  where profiles.id = summary.user_id;
end;
$$;

create or replace function public.recalculate_match_points(target_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  final_result text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can recalculate points';
  end if;

  select result into final_result
  from public.matches
  where id = target_match_id
    and status = 'finished';

  if final_result is null then
    raise exception 'Match must be finished and have a result';
  end if;

  update public.predictions
  set
    is_correct = predicted_result = final_result,
    points_awarded = case when predicted_result = final_result then 1 else 0 end,
    updated_at = now()
  where match_id = target_match_id;

  perform public.recalculate_profile_totals(user_id)
  from public.predictions
  where match_id = target_match_id
  group by user_id;
end;
$$;

create or replace function public.generate_group_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  loop
    code := upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1 from public.groups
      where invite_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.is_group_member(target_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = check_user_id
      and status = 'accepted'
  );
$$;

create or replace function public.can_manage_group(target_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where id = target_group_id
      and owner_id = check_user_id
  )
  or exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = check_user_id
      and status = 'accepted'
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.search_profiles_for_invite(search_text text)
returns table (
  id uuid,
  username text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select profiles.id, profiles.username, profiles.email
  from public.profiles
  where auth.uid() is not null
    and profiles.id <> auth.uid()
    and length(trim(search_text)) >= 2
    and (
      profiles.username ilike '%' || trim(search_text) || '%'
      or profiles.email ilike '%' || trim(search_text) || '%'
    )
  order by profiles.username
  limit 10;
$$;

create or replace function public.create_private_group(group_name text, group_description text default null)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  created_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to create a group';
  end if;

  insert into public.groups (name, description, owner_id, invite_code)
  values (trim(group_name), nullif(trim(coalesce(group_description, '')), ''), auth.uid(), public.generate_group_invite_code())
  returning * into created_group;

  insert into public.group_members (group_id, user_id, role, status)
  values (created_group.id, auth.uid(), 'owner', 'accepted')
  on conflict (group_id, user_id) do update set
    role = 'owner',
    status = 'accepted',
    updated_at = now();

  return created_group;
end;
$$;

create or replace function public.join_group_by_invite_code(target_invite_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to join a group';
  end if;

  select *
  into target_group
  from public.groups
  where invite_code = upper(trim(target_invite_code));

  if target_group.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role, status)
  values (target_group.id, auth.uid(), 'member', 'accepted')
  on conflict (group_id, user_id) do update set
    status = 'accepted',
    updated_at = now();

  update public.group_invitations
  set status = 'accepted', updated_at = now()
  where group_id = target_group.id
    and invited_user_id = auth.uid()
    and status = 'pending';

  return target_group;
end;
$$;

create or replace function public.invite_group_member(target_group_id uuid, target_user_id uuid)
returns public.group_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.group_invitations;
begin
  if not public.can_manage_group(target_group_id, auth.uid()) then
    raise exception 'Only group owners and admins can invite members';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
      and status = 'accepted'
  ) then
    raise exception 'User is already a member of this group';
  end if;

  insert into public.group_invitations (group_id, invited_user_id, invited_by, status)
  values (target_group_id, target_user_id, auth.uid(), 'pending')
  on conflict (group_id, invited_user_id) do update set
    invited_by = auth.uid(),
    status = 'pending',
    updated_at = now()
  returning * into invitation;

  return invitation;
end;
$$;

create or replace function public.respond_group_invitation(target_invitation_id uuid, response_status text)
returns public.group_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.group_invitations;
begin
  if response_status not in ('accepted', 'declined') then
    raise exception 'Invitation response must be accepted or declined';
  end if;

  select *
  into invitation
  from public.group_invitations
  where id = target_invitation_id
    and invited_user_id = auth.uid();

  if invitation.id is null then
    raise exception 'Invitation not found';
  end if;

  update public.group_invitations
  set status = response_status, updated_at = now()
  where id = target_invitation_id
  returning * into invitation;

  if response_status = 'accepted' then
    insert into public.group_members (group_id, user_id, role, status)
    values (invitation.group_id, auth.uid(), 'member', 'accepted')
    on conflict (group_id, user_id) do update set
      status = 'accepted',
      updated_at = now();
  end if;

  return invitation;
end;
$$;

create or replace function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_group(target_group_id, auth.uid()) then
    raise exception 'Only group owners and admins can remove members';
  end if;

  if exists (
    select 1 from public.groups
    where id = target_group_id
      and owner_id = target_user_id
  ) then
    raise exception 'The group owner cannot be removed';
  end if;

  delete from public.group_members
  where group_id = target_group_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.groups
    where id = target_group_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Group owners must delete the group or transfer ownership before leaving';
  end if;

  delete from public.group_members
  where group_id = target_group_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.regenerate_group_invite_code(target_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  if not public.can_manage_group(target_group_id, auth.uid()) then
    raise exception 'Only group owners and admins can regenerate invite codes';
  end if;

  update public.groups
  set invite_code = public.generate_group_invite_code()
  where id = target_group_id
  returning * into target_group;

  return target_group;
end;
$$;

create or replace function public.update_group_details(target_group_id uuid, group_name text, group_description text default null)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  if not public.can_manage_group(target_group_id, auth.uid()) then
    raise exception 'Only group owners and admins can update groups';
  end if;

  update public.groups
  set
    name = trim(group_name),
    description = nullif(trim(coalesce(group_description, '')), '')
  where id = target_group_id
  returning * into target_group;

  return target_group;
end;
$$;

create or replace function public.delete_private_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.groups
    where id = target_group_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can delete this group';
  end if;

  delete from public.groups
  where id = target_group_id;
end;
$$;

create or replace view public.leaderboard_profiles as
select
  id,
  username,
  total_points,
  correct_predictions,
  total_predictions,
  created_at
from public.profiles;

create or replace view public.latest_successful_sync as
select
  provider,
  fallback_used,
  started_at,
  finished_at,
  inserted_count,
  updated_count,
  unchanged_count,
  recalculated_count,
  failed_count,
  created_at
from public.sync_logs
where status = 'success'
order by finished_at desc
limit 1;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.sync_logs enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can update their own username" on public.profiles;
create policy "Users can update their own username"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid() and is_admin = false);

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can read matches" on public.matches;
create policy "Anyone can read matches"
on public.matches for select
using (true);

drop policy if exists "Admins can insert matches" on public.matches;
create policy "Admins can insert matches"
on public.matches for insert
with check (public.is_admin());

drop policy if exists "Admins can update matches" on public.matches;
create policy "Admins can update matches"
on public.matches for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete matches" on public.matches;
create policy "Admins can delete matches"
on public.matches for delete
using (public.is_admin());

drop policy if exists "Users can read own predictions" on public.predictions;
create policy "Users can read own predictions"
on public.predictions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own unlocked predictions" on public.predictions;
create policy "Users can create own unlocked predictions"
on public.predictions for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'upcoming'
      and matches.match_date > now()
  )
);

drop policy if exists "Users can update own unlocked predictions" on public.predictions;
create policy "Users can update own unlocked predictions"
on public.predictions for update
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.matches
    where matches.id = match_id
      and matches.status = 'upcoming'
      and matches.match_date > now()
  )
)
with check (user_id = auth.uid());

drop policy if exists "Admins can manage predictions" on public.predictions;
create policy "Admins can manage predictions"
on public.predictions for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read sync logs" on public.sync_logs;
create policy "Admins can read sync logs"
on public.sync_logs for select
using (public.is_admin());

drop policy if exists "Admins can insert sync logs" on public.sync_logs;
create policy "Admins can insert sync logs"
on public.sync_logs for insert
with check (public.is_admin());

drop policy if exists "Accepted members can read groups" on public.groups;
create policy "Accepted members can read groups"
on public.groups for select
using (owner_id = auth.uid() or public.is_group_member(id));

drop policy if exists "Authenticated users can create owned groups" on public.groups;
create policy "Authenticated users can create owned groups"
on public.groups for insert
with check (owner_id = auth.uid());

drop policy if exists "Group managers can update groups" on public.groups;
create policy "Group managers can update groups"
on public.groups for update
using (public.can_manage_group(id))
with check (public.can_manage_group(id));

drop policy if exists "Group owners can delete groups" on public.groups;
create policy "Group owners can delete groups"
on public.groups for delete
using (owner_id = auth.uid());

drop policy if exists "Members can read group memberships" on public.group_members;
create policy "Members can read group memberships"
on public.group_members for select
using (user_id = auth.uid() or public.is_group_member(group_id));

drop policy if exists "Group managers can insert memberships" on public.group_members;
create policy "Group managers can insert memberships"
on public.group_members for insert
with check (public.can_manage_group(group_id));

drop policy if exists "Group managers can update memberships" on public.group_members;
create policy "Group managers can update memberships"
on public.group_members for update
using (public.can_manage_group(group_id))
with check (public.can_manage_group(group_id));

drop policy if exists "Group managers can delete memberships" on public.group_members;
create policy "Group managers can delete memberships"
on public.group_members for delete
using (public.can_manage_group(group_id));

drop policy if exists "Users and managers can read invitations" on public.group_invitations;
create policy "Users and managers can read invitations"
on public.group_invitations for select
using (invited_user_id = auth.uid() or public.can_manage_group(group_id));

drop policy if exists "Group managers can create invitations" on public.group_invitations;
create policy "Group managers can create invitations"
on public.group_invitations for insert
with check (public.can_manage_group(group_id));

drop policy if exists "Invitees and managers can update invitations" on public.group_invitations;
create policy "Invitees and managers can update invitations"
on public.group_invitations for update
using (invited_user_id = auth.uid() or public.can_manage_group(group_id))
with check (invited_user_id = auth.uid() or public.can_manage_group(group_id));

drop policy if exists "Group managers can delete invitations" on public.group_invitations;
create policy "Group managers can delete invitations"
on public.group_invitations for delete
using (public.can_manage_group(group_id));

grant select on public.leaderboard_profiles to anon, authenticated;
grant select on public.latest_successful_sync to anon, authenticated;
grant select, insert on public.sync_logs to authenticated;
grant execute on function public.recalculate_match_points(uuid) to authenticated;
grant execute on function public.recalculate_match_points(uuid) to service_role;
revoke insert, update, delete on public.groups from authenticated;
revoke insert, update, delete on public.group_members from authenticated;
revoke insert, update, delete on public.group_invitations from authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select on public.group_invitations to authenticated;
grant execute on function public.search_profiles_for_invite(text) to authenticated;
grant execute on function public.create_private_group(text, text) to authenticated;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
grant execute on function public.invite_group_member(uuid, uuid) to authenticated;
grant execute on function public.respond_group_invitation(uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.regenerate_group_invite_code(uuid) to authenticated;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;
grant execute on function public.delete_private_group(uuid) to authenticated;
