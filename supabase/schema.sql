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
  created_at timestamptz not null default now(),
  constraint matches_status_check check (status in ('upcoming', 'live', 'finished')),
  constraint matches_result_check check (result is null or result in ('team_a', 'draw', 'team_b')),
  constraint matches_scores_non_negative check (
    (team_a_score is null or team_a_score >= 0) and
    (team_b_score is null or team_b_score >= 0)
  )
);

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
create index if not exists predictions_user_id_idx on public.predictions(user_id);
create index if not exists predictions_match_id_idx on public.predictions(match_id);
create index if not exists profiles_score_idx on public.profiles(total_points desc, correct_predictions desc);

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

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
before update on public.predictions
for each row execute function public.set_prediction_updated_at();

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
  if not public.is_admin(auth.uid()) then
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

create or replace view public.leaderboard_profiles as
select
  id,
  username,
  total_points,
  correct_predictions,
  total_predictions,
  created_at
from public.profiles;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

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

grant select on public.leaderboard_profiles to anon, authenticated;
grant execute on function public.recalculate_match_points(uuid) to authenticated;
