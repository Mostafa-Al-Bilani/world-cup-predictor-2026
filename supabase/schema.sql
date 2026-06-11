create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  total_points integer not null default 0,
  match_winner_points integer not null default 0,
  exact_score_points integer not null default 0,
  champion_points integer not null default 0,
  bracket_points integer not null default 0,
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
  elapsed integer,
  status_detail text,
  halftime_team_a_score integer,
  halftime_team_b_score integer,
  external_ref text,
  api_slug text,
  provider_name text,
  provider_fixture_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  constraint matches_status_check check (status in ('upcoming', 'live', 'halftime', 'extra_time', 'penalties', 'penalty_shootout', 'finished', 'postponed', 'cancelled')),
  constraint matches_result_check check (result is null or result in ('team_a', 'draw', 'team_b')),
  constraint matches_scores_non_negative check (
    (team_a_score is null or team_a_score >= 0) and
    (team_b_score is null or team_b_score >= 0)
  )
);

alter table public.matches add column if not exists provider_name text;
alter table public.matches add column if not exists provider_fixture_id text;
alter table public.matches add column if not exists last_synced_at timestamptz;
alter table public.matches add column if not exists elapsed integer;
alter table public.matches add column if not exists status_detail text;
alter table public.matches add column if not exists halftime_team_a_score integer;
alter table public.matches add column if not exists halftime_team_b_score integer;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_result text not null,
  predicted_home_score integer,
  predicted_away_score integer,
  is_correct boolean,
  winner_points integer not null default 0,
  exact_score_points integer not null default 0,
  total_points integer not null default 0,
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint predictions_result_check check (predicted_result in ('team_a', 'draw', 'team_b')),
  constraint predictions_points_check check (points_awarded between 0 and 2),
  constraint predictions_winner_points_check check (winner_points in (0, 1)),
  constraint predictions_exact_score_points_check check (exact_score_points in (0, 1)),
  constraint predictions_total_points_check check (total_points between 0 and 2),
  constraint predictions_score_pair_check check (
    (predicted_home_score is null and predicted_away_score is null)
    or (
      predicted_home_score is not null
      and predicted_away_score is not null
      and predicted_home_score between 0 and 99
      and predicted_away_score between 0 and 99
    )
  ),
  constraint predictions_unique_user_match unique (user_id, match_id)
);

alter table public.profiles add column if not exists match_winner_points integer not null default 0;
alter table public.profiles add column if not exists exact_score_points integer not null default 0;
alter table public.profiles add column if not exists champion_points integer not null default 0;
alter table public.profiles add column if not exists bracket_points integer not null default 0;
alter table public.matches drop constraint if exists matches_status_check;
alter table public.matches add constraint matches_status_check
check (status in ('upcoming', 'live', 'halftime', 'extra_time', 'penalties', 'penalty_shootout', 'finished', 'postponed', 'cancelled'));
alter table public.predictions add column if not exists predicted_home_score integer;
alter table public.predictions add column if not exists predicted_away_score integer;
alter table public.predictions add column if not exists winner_points integer not null default 0;
alter table public.predictions add column if not exists exact_score_points integer not null default 0;
alter table public.predictions add column if not exists total_points integer not null default 0;
alter table public.predictions drop constraint if exists predictions_points_check;
alter table public.predictions add constraint predictions_points_check check (points_awarded between 0 and 2);
alter table public.predictions drop constraint if exists predictions_winner_points_check;
alter table public.predictions add constraint predictions_winner_points_check check (winner_points in (0, 1));
alter table public.predictions drop constraint if exists predictions_exact_score_points_check;
alter table public.predictions add constraint predictions_exact_score_points_check check (exact_score_points in (0, 1));
alter table public.predictions drop constraint if exists predictions_total_points_check;
alter table public.predictions add constraint predictions_total_points_check check (total_points between 0 and 2);
alter table public.predictions drop constraint if exists predictions_score_pair_check;
alter table public.predictions add constraint predictions_score_pair_check check (
  (predicted_home_score is null and predicted_away_score is null)
  or (
    predicted_home_score is not null
    and predicted_away_score is not null
    and predicted_home_score between 0 and 99
    and predicted_away_score between 0 and 99
  )
);
update public.predictions
set
  winner_points = points_awarded,
  total_points = points_awarded
where points_awarded in (0, 1)
  and winner_points = 0
  and exact_score_points = 0
  and total_points = 0;

create table if not exists public.world_cup_winner_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  predicted_team text not null,
  points_awarded integer not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint world_cup_winner_predictions_unique_user unique (user_id),
  constraint world_cup_winner_predictions_points_check check (points_awarded in (0, 3)),
  constraint world_cup_winner_predictions_team_not_blank check (length(trim(predicted_team)) > 0)
);

create table if not exists public.stage_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stage text not null,
  selected_teams text[] not null default '{}',
  correct_teams text[] not null default '{}',
  locked_at timestamptz,
  points_awarded integer not null default 0,
  correct_count integer not null default 0,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stage_predictions_stage_check check (stage in ('round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'finalists')),
  constraint stage_predictions_unique_user_stage unique (user_id, stage),
  constraint stage_predictions_points_check check (points_awarded >= 0),
  constraint stage_predictions_correct_count_check check (correct_count >= 0),
  constraint stage_predictions_selected_not_empty check (cardinality(selected_teams) > 0)
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
create index if not exists world_cup_winner_predictions_user_id_idx on public.world_cup_winner_predictions(user_id);
create index if not exists world_cup_winner_predictions_team_idx on public.world_cup_winner_predictions(predicted_team);
create index if not exists stage_predictions_user_id_idx on public.stage_predictions(user_id);
create index if not exists stage_predictions_stage_idx on public.stage_predictions(stage);
create index if not exists stage_predictions_scored_at_idx on public.stage_predictions(scored_at);

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
alter table public.groups add column if not exists live_predictions_enabled boolean not null default false;

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
      and (
        coalesce(auth.role(), '') = 'service_role'
        or check_user_id = auth.uid()
      )
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

drop trigger if exists world_cup_winner_predictions_set_updated_at on public.world_cup_winner_predictions;
create trigger world_cup_winner_predictions_set_updated_at
before update on public.world_cup_winner_predictions
for each row execute function public.set_updated_at();

drop trigger if exists stage_predictions_set_updated_at on public.stage_predictions;
create trigger stage_predictions_set_updated_at
before update on public.stage_predictions
for each row execute function public.set_updated_at();

create or replace function public.protect_profile_trusted_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;

  new.id := old.id;
  new.email := old.email;
  new.total_points := old.total_points;
  new.match_winner_points := old.match_winner_points;
  new.exact_score_points := old.exact_score_points;
  new.champion_points := old.champion_points;
  new.bracket_points := old.bracket_points;
  new.correct_predictions := old.correct_predictions;
  new.total_predictions := old.total_predictions;
  new.is_admin := old.is_admin;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_trusted_fields on public.profiles;
create trigger profiles_protect_trusted_fields
before update on public.profiles
for each row execute function public.protect_profile_trusted_fields();

create or replace function public.prevent_user_admin_flag_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_admin is distinct from new.is_admin
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only service role can change admin status.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_user_admin_flag_change on public.profiles;
create trigger profiles_prevent_user_admin_flag_change
before update on public.profiles
for each row execute function public.prevent_user_admin_flag_change();

create or replace function public.match_allows_draw(match_stage text)
returns boolean
language sql
immutable
as $$
  select lower(trim(coalesce(match_stage, ''))) like 'group%';
$$;

create or replace function public.is_valid_world_cup_team(team_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from (
      select team_a as team from public.matches
      union
      select team_b as team from public.matches
    ) teams
    where lower(trim(teams.team)) = lower(trim(team_name))
      and trim(teams.team) <> ''
      and lower(trim(teams.team)) not in ('tbd', 'to be determined')
  );
$$;

create or replace function public.team_compare_key(team_name text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    trim(regexp_replace(regexp_replace(lower(coalesce(team_name, '')), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g')),
    '\s+',
    ' ',
    'g'
  );
$$;

create or replace function public.is_placeholder_team_name(team_name text)
returns boolean
language sql
immutable
as $$
  select
    trim(coalesce(team_name, '')) = ''
    or lower(trim(coalesce(team_name, ''))) in ('tbd', 'to be determined')
    or lower(trim(coalesce(team_name, ''))) ~ '^(?:[123][a-l](?:/[a-l])*|[a-l][123]?|w[0-9]+|l[0-9]+|group [a-l] (?:1st|2nd|3rd) place|round of [0-9]+ [0-9]+ winner|round of [0-9]+ [0-9]+ loser|quarterfinal [0-9]+ winner|quarterfinal [0-9]+ loser|semifinal [0-9]+ winner|semifinal [0-9]+ loser)$';
$$;

create or replace function public.normalize_stage_prediction_stage(stage_name text)
returns text
language plpgsql
immutable
as $$
declare
  stage_key text;
begin
  stage_key := trim(regexp_replace(lower(coalesce(stage_name, '')), '[^a-z0-9]+', ' ', 'g'));

  if stage_key in ('round of 32', 'round 32', 'round_of_32') then
    return 'round_of_32';
  elsif stage_key in ('round of 16', 'round 16', 'round_of_16') then
    return 'round_of_16';
  elsif stage_key like '%quarter%' then
    return 'quarter_finals';
  elsif stage_key like '%semi%' then
    return 'semi_finals';
  elsif stage_key in ('final', 'finals', 'finalists') then
    return 'finalists';
  end if;

  return null;
end;
$$;

create or replace function public.normalize_match_prediction_stage(stage_name text)
returns text
language plpgsql
immutable
as $$
declare
  stage_key text;
begin
  stage_key := trim(regexp_replace(lower(coalesce(stage_name, '')), '[^a-z0-9]+', ' ', 'g'));

  if stage_key like '%third%' then
    return null;
  elsif stage_key like '%round%32%' then
    return 'round_of_32';
  elsif stage_key like '%round%16%' then
    return 'round_of_16';
  elsif stage_key like '%quarter%' then
    return 'quarter_finals';
  elsif stage_key like '%semi%' then
    return 'semi_finals';
  elsif stage_key in ('final', 'finals') then
    return 'finalists';
  end if;

  return null;
end;
$$;

create or replace function public.stage_prediction_required_count(stage_name text)
returns integer
language sql
immutable
as $$
  select case public.normalize_stage_prediction_stage(stage_name)
    when 'round_of_32' then 32
    when 'round_of_16' then 16
    when 'quarter_finals' then 8
    when 'semi_finals' then 4
    when 'finalists' then 2
    else null
  end;
$$;

create or replace function public.stage_prediction_point_value(stage_name text)
returns integer
language sql
immutable
as $$
  select case public.normalize_stage_prediction_stage(stage_name)
    when 'round_of_32' then 1
    when 'round_of_16' then 2
    when 'quarter_finals' then 3
    when 'semi_finals' then 4
    when 'finalists' then 5
    else null
  end;
$$;

create or replace function public.stage_prediction_lock_at(stage_name text)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select min(match_date)
  from public.matches
  where public.normalize_match_prediction_stage(stage) = public.normalize_stage_prediction_stage(stage_name);
$$;

create or replace function public.is_valid_stage_prediction_team(team_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.is_placeholder_team_name(team_name)
    and exists (
      select 1
      from (
        select team_a as team from public.matches
        union
        select team_b as team from public.matches
      ) teams
      where not public.is_placeholder_team_name(teams.team)
        and public.team_compare_key(teams.team) = public.team_compare_key(team_name)
    );
$$;

create or replace function public.protect_prediction_scoring_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_correct := null;
    new.winner_points := 0;
    new.exact_score_points := 0;
    new.total_points := 0;
    new.points_awarded := 0;
    return new;
  end if;

  new.is_correct := old.is_correct;
  new.winner_points := old.winner_points;
  new.exact_score_points := old.exact_score_points;
  new.total_points := old.total_points;
  new.points_awarded := old.points_awarded;
  return new;
end;
$$;

drop trigger if exists predictions_protect_scoring_fields on public.predictions;
create trigger predictions_protect_scoring_fields
before insert or update on public.predictions
for each row execute function public.protect_prediction_scoring_fields();

create or replace function public.protect_stage_prediction_scoring_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or public.is_admin(auth.uid()) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.correct_teams := '{}';
    new.points_awarded := 0;
    new.correct_count := 0;
    new.scored_at := null;
    return new;
  end if;

  new.correct_teams := old.correct_teams;
  new.points_awarded := old.points_awarded;
  new.correct_count := old.correct_count;
  new.scored_at := old.scored_at;
  return new;
end;
$$;

drop trigger if exists stage_predictions_protect_scoring_fields on public.stage_predictions;
create trigger stage_predictions_protect_scoring_fields
before insert or update on public.stage_predictions
for each row execute function public.protect_stage_prediction_scoring_fields();

create or replace function public.prevent_locked_prediction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starts_at timestamptz;
  current_status text;
  current_stage text;
  current_team_a text;
  current_team_b text;
begin
  select match_date, status, stage, team_a, team_b
  into starts_at, current_status, current_stage, current_team_a, current_team_b
  from public.matches
  where id = new.match_id;

  if starts_at is null then
    raise exception 'Match not found.';
  end if;

  if public.is_placeholder_team_name(current_team_a)
     or public.is_placeholder_team_name(current_team_b) then
    raise exception 'Predictions open when both real teams are known.';
  end if;

  if starts_at <= now() then
    raise exception 'Predictions are locked because the match has already started.';
  end if;

  if current_status <> 'upcoming' then
    raise exception 'Predictions are locked because this match is not open for predictions.';
  end if;

  if new.predicted_result = 'draw' and not public.match_allows_draw(current_stage) then
    raise exception 'Draw predictions are only allowed for group-stage matches.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_incomplete_score_predictions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.predicted_home_score is null or new.predicted_away_score is null then
    raise exception 'Enter both scores before saving your prediction.';
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_require_scores_trigger on public.predictions;

create trigger predictions_require_scores_trigger
before insert or update on public.predictions
for each row
execute function public.prevent_incomplete_score_predictions();

create or replace function public.prevent_inconsistent_prediction_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stage text;
begin
  select stage
  into current_stage
  from public.matches
  where id = new.match_id;

  if current_stage is null then
    raise exception 'Match not found.';
  end if;

  if new.predicted_home_score is null or new.predicted_away_score is null then
    raise exception 'Enter both scores before saving your prediction.';
  end if;

  if new.predicted_home_score > new.predicted_away_score
     and new.predicted_result <> 'team_a' then
    raise exception 'Prediction result must match the predicted score.';
  end if;

  if new.predicted_home_score < new.predicted_away_score
     and new.predicted_result <> 'team_b' then
    raise exception 'Prediction result must match the predicted score.';
  end if;

  if new.predicted_home_score = new.predicted_away_score
     and new.predicted_result <> 'draw' then
    raise exception 'Prediction result must match the predicted score.';
  end if;

  if new.predicted_result = 'draw' and not public.match_allows_draw(current_stage) then
    raise exception 'Draw predictions are only allowed for group-stage matches.';
  end if;

  return new;
end;
$$;

drop trigger if exists predictions_prevent_inconsistent_score on public.predictions;

create trigger predictions_prevent_inconsistent_score
before insert or update of predicted_result, predicted_home_score, predicted_away_score
on public.predictions
for each row
execute function public.prevent_inconsistent_prediction_score();

drop trigger if exists predictions_prevent_locked_insert on public.predictions;
create trigger predictions_prevent_locked_insert
before insert on public.predictions
for each row execute function public.prevent_locked_prediction_change();

drop trigger if exists predictions_prevent_locked_update on public.predictions;
create trigger predictions_prevent_locked_update
before update of predicted_result, predicted_home_score, predicted_away_score on public.predictions
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
    total_points = coalesce(summary.match_winner_points, 0) + coalesce(summary.exact_score_points, 0) + coalesce(champion.summary_points, 0) + coalesce(bracket.summary_points, 0),
    match_winner_points = coalesce(summary.match_winner_points, 0),
    exact_score_points = coalesce(summary.exact_score_points, 0),
    champion_points = coalesce(champion.summary_points, 0),
    bracket_points = coalesce(bracket.summary_points, 0),
    correct_predictions = coalesce(summary.correct_predictions, 0),
    total_predictions = coalesce(summary.total_predictions, 0)
  from (
    select
      target_user_id as user_id,
      coalesce(sum(winner_points), 0)::integer as match_winner_points,
      coalesce(sum(exact_score_points), 0)::integer as exact_score_points,
      count(*) filter (where is_correct = true)::integer as correct_predictions,
      count(*)::integer as total_predictions
    from public.predictions
    where user_id = target_user_id
  ) summary,
  (
    select coalesce(sum(points_awarded), 0)::integer as summary_points
    from public.world_cup_winner_predictions
    where user_id = target_user_id
  ) champion,
  (
    select coalesce(sum(points_awarded), 0)::integer as summary_points
    from public.stage_predictions
    where user_id = target_user_id
  ) bracket
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
  final_team_a_score integer;
  final_team_b_score integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can recalculate points';
  end if;

  select result, team_a_score, team_b_score
  into final_result, final_team_a_score, final_team_b_score
  from public.matches
  where id = target_match_id
    and status = 'finished';

  if final_result is null or final_team_a_score is null or final_team_b_score is null then
    raise exception 'Match must be finished and have a result and final score';
  end if;

  with scored as (
    select
      id,
      case when predicted_result = final_result then 1 else 0 end as next_winner_points,
      case
        when predicted_result = final_result
          and predicted_home_score is not null
          and predicted_away_score is not null
          and predicted_home_score = final_team_a_score
          and predicted_away_score = final_team_b_score
        then 1
        else 0
      end as next_exact_score_points
    from public.predictions
    where match_id = target_match_id
  )
  update public.predictions
  set
    is_correct = scored.next_winner_points = 1,
    winner_points = scored.next_winner_points,
    exact_score_points = scored.next_exact_score_points,
    total_points = scored.next_winner_points + scored.next_exact_score_points,
    points_awarded = scored.next_winner_points + scored.next_exact_score_points,
    updated_at = now()
  from scored
  where predictions.id = scored.id;

  perform public.recalculate_profile_totals(user_id)
  from public.predictions
  where match_id = target_match_id
  group by user_id;

  perform public.recalculate_champion_points();
  perform public.recalculate_stage_prediction_points(null);
end;
$$;

create or replace function public.recalculate_champion_points()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  champion_team text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can recalculate champion points';
  end if;

  select case result
    when 'team_a' then team_a
    when 'team_b' then team_b
    else null
  end
  into champion_team
  from public.matches
  where status = 'finished'
    and result in ('team_a', 'team_b')
    and (
      lower(trim(stage)) in ('final', 'finals')
      or match_number = 104
    )
  order by case when match_number = 104 then 0 else 1 end, match_date desc
  limit 1;

  if champion_team is null then
    return;
  end if;

  update public.world_cup_winner_predictions
  set
    points_awarded = case when lower(trim(predicted_team)) = lower(trim(champion_team)) then 3 else 0 end,
    updated_at = now();

  perform public.recalculate_profile_totals(user_id)
  from public.world_cup_winner_predictions
  group by user_id;
end;
$$;

create or replace function public.set_world_cup_winner_prediction(team_name text)
returns public.world_cup_winner_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_team text;
  existing_prediction public.world_cup_winner_predictions;
  saved_prediction public.world_cup_winner_predictions;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to choose a World Cup winner';
  end if;

  normalized_team := trim(coalesce(team_name, ''));

  if normalized_team = '' or length(normalized_team) > 80 then
    raise exception 'Choose a valid team';
  end if;

  if not public.is_valid_world_cup_team(normalized_team) then
    raise exception 'Choose a team from the World Cup fixtures';
  end if;

  select *
  into existing_prediction
  from public.world_cup_winner_predictions
  where user_id = auth.uid();

  if existing_prediction.id is not null and existing_prediction.locked_at is not null then
    raise exception 'World Cup winner prediction is already locked';
  end if;

  insert into public.world_cup_winner_predictions (user_id, predicted_team, locked_at)
  values (auth.uid(), normalized_team, now())
  on conflict (user_id) do update set
    predicted_team = excluded.predicted_team,
    locked_at = coalesce(public.world_cup_winner_predictions.locked_at, now()),
    updated_at = now()
  returning * into saved_prediction;

  return saved_prediction;
end;
$$;

create or replace function public.save_stage_prediction(target_stage text, selected_teams text[])
returns public.stage_predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_stage text;
  required_count integer;
  stage_lock_at timestamptz;
  cleaned_teams text[];
  saved_prediction public.stage_predictions;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to save bracket predictions';
  end if;

  normalized_stage := public.normalize_stage_prediction_stage(target_stage);
  required_count := public.stage_prediction_required_count(normalized_stage);

  if normalized_stage is null or required_count is null then
    raise exception 'Choose a valid bracket stage';
  end if;

  select array_agg(trim(selected.team_name) order by trim(selected.team_name))
  into cleaned_teams
  from unnest(coalesce(selected_teams, '{}')) as selected(team_name)
  where trim(selected.team_name) <> '';

  cleaned_teams := coalesce(cleaned_teams, '{}');

  if cardinality(cleaned_teams) <> required_count then
    raise exception 'Select exactly % teams for this stage', required_count;
  end if;

  if (
    select count(distinct public.team_compare_key(selected.team_name))
    from unnest(cleaned_teams) as selected(team_name)
  ) <> required_count then
    raise exception 'Do not select the same team twice';
  end if;

  if exists (
    select 1
    from unnest(cleaned_teams) as selected(team_name)
    where not public.is_valid_stage_prediction_team(selected.team_name)
  ) then
    raise exception 'Choose teams from the tournament team list';
  end if;

  stage_lock_at := public.stage_prediction_lock_at(normalized_stage);

  if stage_lock_at is not null and stage_lock_at <= now() then
    raise exception 'This stage is locked';
  end if;

  insert into public.stage_predictions (user_id, stage, selected_teams, locked_at)
  values (auth.uid(), normalized_stage, cleaned_teams, stage_lock_at)
  on conflict (user_id, stage) do update set
    selected_teams = excluded.selected_teams,
    locked_at = excluded.locked_at,
    correct_teams = '{}',
    points_awarded = 0,
    correct_count = 0,
    scored_at = null,
    updated_at = now()
  where public.stage_predictions.scored_at is null
    and (public.stage_predictions.locked_at is null or public.stage_predictions.locked_at > now())
  returning * into saved_prediction;

  if saved_prediction.id is null then
    raise exception 'This stage is locked';
  end if;

  return saved_prediction;
end;
$$;

create or replace function public.recalculate_stage_prediction_points(target_stage text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_stage text;
  stage_name text;
  stage_lock_at timestamptz;
  actual_team_count integer;
  required_count integer;
  point_value integer;
  updated_count integer := 0;
  total_updated integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can recalculate bracket points';
  end if;

  normalized_stage := public.normalize_stage_prediction_stage(target_stage);

  if target_stage is null then
    foreach stage_name in array array['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'finalists']
    loop
      total_updated := total_updated + public.recalculate_stage_prediction_points(stage_name);
    end loop;
    return total_updated;
  end if;

  if normalized_stage is null then
    raise exception 'Choose a valid bracket stage';
  end if;

  required_count := public.stage_prediction_required_count(normalized_stage);
  point_value := public.stage_prediction_point_value(normalized_stage);
  stage_lock_at := public.stage_prediction_lock_at(normalized_stage);

  if stage_lock_at is null or stage_lock_at > now() then
    return 0;
  end if;

  select count(distinct public.team_compare_key(team_name))
  into actual_team_count
  from (
    select team_a as team_name
    from public.matches
    where public.normalize_match_prediction_stage(stage) = normalized_stage
    union all
    select team_b as team_name
    from public.matches
    where public.normalize_match_prediction_stage(stage) = normalized_stage
  ) teams
  where not public.is_placeholder_team_name(team_name);

  if actual_team_count < required_count then
    return 0;
  end if;

  with actual_teams as (
    select distinct public.team_compare_key(team_name) as team_key
    from (
      select team_a as team_name
      from public.matches
      where public.normalize_match_prediction_stage(stage) = normalized_stage
      union all
      select team_b as team_name
      from public.matches
      where public.normalize_match_prediction_stage(stage) = normalized_stage
    ) teams
    where not public.is_placeholder_team_name(team_name)
  ),
  scored as (
    select
      prediction.id,
      prediction.user_id,
      coalesce(array_agg(selected.selected_team) filter (where actual_teams.team_key is not null), '{}') as next_correct_teams,
      count(actual_teams.team_key)::integer as next_correct_count
    from public.stage_predictions prediction
    cross join lateral unnest(prediction.selected_teams) as selected(selected_team)
    left join actual_teams
      on actual_teams.team_key = public.team_compare_key(selected.selected_team)
    where prediction.stage = normalized_stage
      and coalesce(prediction.locked_at, stage_lock_at) <= now()
    group by prediction.id, prediction.user_id
  ),
  updated as (
    update public.stage_predictions
    set
      locked_at = coalesce(stage_predictions.locked_at, stage_lock_at),
      correct_teams = scored.next_correct_teams,
      correct_count = scored.next_correct_count,
      points_awarded = scored.next_correct_count * point_value,
      scored_at = now(),
      updated_at = now()
    from scored
    where stage_predictions.id = scored.id
    returning stage_predictions.user_id
  )
  select count(*) into updated_count from updated;

  perform public.recalculate_profile_totals(user_id)
  from public.stage_predictions
  where stage = normalized_stage
  group by user_id;

  return coalesce(updated_count, 0);
end;
$$;

create or replace function public.generate_group_invite_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.ensure_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'accepted')
  on conflict (group_id, user_id) do update set
    role = 'owner',
    status = 'accepted',
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists groups_ensure_owner_membership on public.groups;
create trigger groups_ensure_owner_membership
after insert on public.groups
for each row execute function public.ensure_group_owner_membership();

insert into public.group_members (group_id, user_id, role, status)
select id, owner_id, 'owner', 'accepted'
from public.groups
where owner_id is not null
on conflict (group_id, user_id) do update set
  role = 'owner',
  status = 'accepted',
  updated_at = now();

create or replace function public.is_group_member(target_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = check_user_id
      and gm.status = 'accepted'
  );
$$;

create or replace function public.can_manage_group(target_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select check_user_id is not null
    and (
      exists (
        select 1
        from public.groups g
        where g.id = target_group_id
          and g.owner_id = check_user_id
      )
      or exists (
        select 1
        from public.group_members gm
        where gm.group_id = target_group_id
          and gm.user_id = check_user_id
          and gm.status = 'accepted'
          and gm.role in ('owner', 'admin')
      )
    );
$$;

drop function if exists public.search_profiles_for_invite(text);
create or replace function public.search_profiles_for_invite(target_group_id uuid, search_text text)
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
    and public.can_manage_group(target_group_id, auth.uid())
    and profiles.id <> auth.uid()
    and length(trim(search_text)) >= 2
    and length(trim(search_text)) <= 80
    and (
      profiles.username ilike '%' || trim(search_text) || '%'
      or profiles.email ilike '%' || trim(search_text) || '%'
    )
    and not exists (
      select 1
      from public.group_members
      where group_id = target_group_id
        and user_id = profiles.id
        and status = 'accepted'
    )
    and not exists (
      select 1
      from public.group_invitations
      where group_id = target_group_id
        and invited_user_id = profiles.id
        and status = 'pending'
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

  if length(trim(coalesce(group_name, ''))) = 0 or length(trim(group_name)) > 80 then
    raise exception 'Group name must be between 1 and 80 characters';
  end if;

  if length(trim(coalesce(group_description, ''))) > 500 then
    raise exception 'Group description must be 500 characters or fewer';
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
  normalized_code text;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to join a group';
  end if;

  normalized_code := upper(trim(coalesce(target_invite_code, '')));

  if normalized_code !~ '^[A-F0-9]{8}$' then
    raise exception 'Invalid invite code';
  end if;

  select *
  into target_group
  from public.groups
  where invite_code = normalized_code;

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

  if target_user_id = auth.uid() then
    raise exception 'You cannot invite yourself';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_user_id
  ) then
    raise exception 'User not found';
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

  if length(trim(coalesce(group_name, ''))) = 0 or length(trim(group_name)) > 80 then
    raise exception 'Group name must be between 1 and 80 characters';
  end if;

  if length(trim(coalesce(group_description, ''))) > 500 then
    raise exception 'Group description must be 500 characters or fewer';
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

create or replace function public.update_group_live_predictions_setting(
  target_group_id uuid,
  enabled boolean
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  if not public.can_manage_group(target_group_id, auth.uid()) then
    raise exception 'Only group owners and admins can update live prediction settings';
  end if;

  update public.groups
  set
    live_predictions_enabled = enabled,
    updated_at = now()
  where id = target_group_id
  returning * into target_group;

  if target_group.id is null then
    raise exception 'Group not found';
  end if;

  return target_group;
end;
$$;

create or replace function public.get_live_group_predictions(target_group_id uuid)
returns table (
  match_id uuid,
  match_number integer,
  team_a text,
  team_b text,
  team_a_score integer,
  team_b_score integer,
  match_status text,
  match_date timestamptz,
  stage text,
  user_id uuid,
  username text,
  predicted_result text,
  predicted_home_score integer,
  predicted_away_score integer
)
language sql
security definer
set search_path = public
as $$
  select
    m.id as match_id,
    m.match_number,
    m.team_a,
    m.team_b,
    m.team_a_score,
    m.team_b_score,
    m.status as match_status,
    m.match_date,
    m.stage,
    p.user_id,
    coalesce(lp.username, 'Unknown player') as username,
    p.predicted_result,
    p.predicted_home_score,
    p.predicted_away_score
  from public.groups g
  join public.group_members gm
    on gm.group_id = g.id
   and gm.status = 'accepted'
  join public.predictions p
    on p.user_id = gm.user_id
  join public.matches m
    on m.id = p.match_id
  left join public.leaderboard_profiles lp
    on lp.id = p.user_id
  where g.id = target_group_id
    and g.live_predictions_enabled = true
    and m.match_date <= now()
    and m.status in ('live', 'halftime')
    and exists (
      select 1
      from public.group_members viewer_membership
      where viewer_membership.group_id = target_group_id
        and viewer_membership.user_id = auth.uid()
        and viewer_membership.status = 'accepted'
    )
  order by m.match_date, lp.username;
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

drop view if exists public.leaderboard_profiles;
create view public.leaderboard_profiles as
select
  id,
  username,
  total_points,
  match_winner_points,
  exact_score_points,
  champion_points,
  bracket_points,
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
alter table public.world_cup_winner_predictions enable row level security;
alter table public.stage_predictions enable row level security;

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
      and not public.is_placeholder_team_name(matches.team_a)
      and not public.is_placeholder_team_name(matches.team_b)
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
      and not public.is_placeholder_team_name(matches.team_a)
      and not public.is_placeholder_team_name(matches.team_b)
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

drop policy if exists "Members can read their groups" on public.groups;
drop policy if exists "Members can read members of their groups" on public.group_members;

drop policy if exists "Accepted members can read groups" on public.groups;
create policy "Accepted members can read groups"
on public.groups for select
using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));

drop policy if exists "Authenticated users can create owned groups" on public.groups;
create policy "Authenticated users can create owned groups"
on public.groups for insert
with check (owner_id = auth.uid());

drop policy if exists "Group managers can update groups" on public.groups;
create policy "Group managers can update groups"
on public.groups for update
using (public.can_manage_group(id, auth.uid()))
with check (public.can_manage_group(id, auth.uid()));

drop policy if exists "Group owners can delete groups" on public.groups;
create policy "Group owners can delete groups"
on public.groups for delete
using (owner_id = auth.uid());

drop policy if exists "Members can read group memberships" on public.group_members;
create policy "Members can read group memberships"
on public.group_members for select
using (
  user_id = auth.uid()
  or public.is_group_member(group_id, auth.uid())
  or public.can_manage_group(group_id, auth.uid())
);

drop policy if exists "Group managers can insert memberships" on public.group_members;
create policy "Group managers can insert memberships"
on public.group_members for insert
with check (public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Group managers can update memberships" on public.group_members;
create policy "Group managers can update memberships"
on public.group_members for update
using (public.can_manage_group(group_id))
with check (public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Group managers can delete memberships" on public.group_members;
create policy "Group managers can delete memberships"
on public.group_members for delete
using (public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Users and managers can read invitations" on public.group_invitations;
create policy "Users and managers can read invitations"
on public.group_invitations for select
using (invited_user_id = auth.uid() or public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Group managers can create invitations" on public.group_invitations;
create policy "Group managers can create invitations"
on public.group_invitations for insert
with check (public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Invitees and managers can update invitations" on public.group_invitations;
create policy "Invitees and managers can update invitations"
on public.group_invitations for update
using (invited_user_id = auth.uid() or public.can_manage_group(group_id, auth.uid()))
with check (invited_user_id = auth.uid() or public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Group managers can delete invitations" on public.group_invitations;
create policy "Group managers can delete invitations"
on public.group_invitations for delete
using (public.can_manage_group(group_id, auth.uid()));

drop policy if exists "Users can read own champion prediction" on public.world_cup_winner_predictions;
create policy "Users can read own champion prediction"
on public.world_cup_winner_predictions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own unlocked champion prediction" on public.world_cup_winner_predictions;
create policy "Users can create own unlocked champion prediction"
on public.world_cup_winner_predictions for insert
with check (user_id = auth.uid() and points_awarded = 0);

drop policy if exists "Users can update own unlocked champion prediction" on public.world_cup_winner_predictions;
create policy "Users can update own unlocked champion prediction"
on public.world_cup_winner_predictions for update
using (user_id = auth.uid() and locked_at is null)
with check (user_id = auth.uid() and locked_at is null and points_awarded = 0);

drop policy if exists "Admins can manage champion predictions" on public.world_cup_winner_predictions;
create policy "Admins can manage champion predictions"
on public.world_cup_winner_predictions for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own stage predictions" on public.stage_predictions;
create policy "Users can read own stage predictions"
on public.stage_predictions for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own unlocked stage predictions" on public.stage_predictions;
create policy "Users can create own unlocked stage predictions"
on public.stage_predictions for insert
with check (
  user_id = auth.uid()
  and points_awarded = 0
  and correct_count = 0
  and scored_at is null
  and (locked_at is null or locked_at > now())
);

drop policy if exists "Users can update own unlocked stage predictions" on public.stage_predictions;
create policy "Users can update own unlocked stage predictions"
on public.stage_predictions for update
using (
  user_id = auth.uid()
  and scored_at is null
  and (locked_at is null or locked_at > now())
)
with check (
  user_id = auth.uid()
  and points_awarded = 0
  and correct_count = 0
  and scored_at is null
  and (locked_at is null or locked_at > now())
);

drop policy if exists "Admins can manage stage predictions" on public.stage_predictions;
create policy "Admins can manage stage predictions"
on public.stage_predictions for all
using (public.is_admin())
with check (public.is_admin());

grant select on public.matches to anon, authenticated;
grant select on public.leaderboard_profiles to anon, authenticated;
grant select on public.latest_successful_sync to anon, authenticated;
grant select, insert on public.sync_logs to authenticated;

revoke insert, update, delete on public.matches from anon;
revoke insert, update, delete on public.matches from authenticated;
revoke insert, update, delete on public.groups from anon;
revoke insert, update, delete on public.group_members from anon;
revoke insert, update, delete on public.group_invitations from anon;
revoke insert, update, delete on public.world_cup_winner_predictions from anon;
revoke insert, update, delete on public.stage_predictions from anon;
revoke insert, update, delete on public.groups from authenticated;
revoke insert, update, delete on public.group_members from authenticated;
revoke insert, update, delete on public.group_invitations from authenticated;
revoke insert, update, delete on public.world_cup_winner_predictions from authenticated;
revoke insert, update, delete on public.stage_predictions from authenticated;

revoke execute on function public.prevent_inconsistent_prediction_score() from PUBLIC;
revoke execute on function public.prevent_inconsistent_prediction_score() from authenticated;
revoke execute on function public.recalculate_match_points(uuid) from PUBLIC;
revoke execute on function public.recalculate_match_points(uuid) from authenticated;
revoke execute on function public.recalculate_profile_totals(uuid) from PUBLIC;
revoke execute on function public.generate_group_invite_code() from PUBLIC;
revoke execute on function public.set_world_cup_winner_prediction(text) from PUBLIC;
revoke execute on function public.recalculate_champion_points() from PUBLIC;
revoke execute on function public.save_stage_prediction(text, text[]) from PUBLIC;
revoke execute on function public.recalculate_stage_prediction_points(text) from PUBLIC;
revoke execute on function public.recalculate_stage_prediction_points(text) from authenticated;
revoke execute on function public.search_profiles_for_invite(uuid, text) from PUBLIC;
revoke execute on function public.create_private_group(text, text) from PUBLIC;
revoke execute on function public.join_group_by_invite_code(text) from PUBLIC;
revoke execute on function public.invite_group_member(uuid, uuid) from PUBLIC;
revoke execute on function public.respond_group_invitation(uuid, text) from PUBLIC;
revoke execute on function public.remove_group_member(uuid, uuid) from PUBLIC;
revoke execute on function public.leave_group(uuid) from PUBLIC;
revoke execute on function public.regenerate_group_invite_code(uuid) from PUBLIC;
revoke execute on function public.update_group_details(uuid, text, text) from PUBLIC;
revoke execute on function public.update_group_live_predictions_setting(uuid, boolean) from PUBLIC;
revoke execute on function public.get_live_group_predictions(uuid) from PUBLIC;
revoke execute on function public.delete_private_group(uuid) from PUBLIC;

grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select on public.group_invitations to authenticated;
grant select on public.world_cup_winner_predictions to authenticated;
grant select on public.stage_predictions to authenticated;
grant execute on function public.update_group_live_predictions_setting(uuid, boolean) to authenticated;
grant execute on function public.get_live_group_predictions(uuid) to authenticated;

grant execute on function public.recalculate_match_points(uuid) to service_role;
grant execute on function public.set_world_cup_winner_prediction(text) to authenticated;
grant execute on function public.recalculate_champion_points() to service_role;
grant execute on function public.save_stage_prediction(text, text[]) to authenticated;
grant execute on function public.recalculate_stage_prediction_points(text) to service_role;
grant execute on function public.search_profiles_for_invite(uuid, text) to authenticated;
grant execute on function public.create_private_group(text, text) to authenticated;
grant execute on function public.join_group_by_invite_code(text) to authenticated;
grant execute on function public.invite_group_member(uuid, uuid) to authenticated;
grant execute on function public.respond_group_invitation(uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.regenerate_group_invite_code(uuid) to authenticated;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;
grant execute on function public.delete_private_group(uuid) to authenticated;

-- =====================================================================
-- FINAL LOCAL SCHEMA PATCHES
-- Added after the base schema so this file can be used as a complete
-- local schema and still override older definitions safely.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Safe public leaderboard surface.
-- Keeps public scores available without exposing profiles.email/is_admin.
-- ---------------------------------------------------------------------

create table if not exists public.public_leaderboard_profiles (
  id uuid primary key,
  username text not null,
  total_points integer not null default 0,
  match_winner_points integer not null default 0,
  exact_score_points integer not null default 0,
  champion_points integer not null default 0,
  bracket_points integer not null default 0,
  correct_predictions integer not null default 0,
  total_predictions integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.public_leaderboard_profiles enable row level security;

drop policy if exists "Public can read public leaderboard profiles"
on public.public_leaderboard_profiles;

create policy "Public can read public leaderboard profiles"
on public.public_leaderboard_profiles
for select
using (true);

insert into public.public_leaderboard_profiles (
  id,
  username,
  total_points,
  match_winner_points,
  exact_score_points,
  champion_points,
  bracket_points,
  correct_predictions,
  total_predictions,
  created_at
)
select
  id,
  username,
  total_points,
  match_winner_points,
  exact_score_points,
  champion_points,
  bracket_points,
  correct_predictions,
  total_predictions,
  created_at
from public.profiles
on conflict (id) do update set
  username = excluded.username,
  total_points = excluded.total_points,
  match_winner_points = excluded.match_winner_points,
  exact_score_points = excluded.exact_score_points,
  champion_points = excluded.champion_points,
  bracket_points = excluded.bracket_points,
  correct_predictions = excluded.correct_predictions,
  total_predictions = excluded.total_predictions,
  created_at = excluded.created_at;

create or replace function public.sync_public_leaderboard_profile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.public_leaderboard_profiles (
    id,
    username,
    total_points,
    match_winner_points,
    exact_score_points,
    champion_points,
    bracket_points,
    correct_predictions,
    total_predictions,
    created_at
  )
  values (
    new.id,
    new.username,
    new.total_points,
    new.match_winner_points,
    new.exact_score_points,
    new.champion_points,
    new.bracket_points,
    new.correct_predictions,
    new.total_predictions,
    new.created_at
  )
  on conflict (id) do update set
    username = excluded.username,
    total_points = excluded.total_points,
    match_winner_points = excluded.match_winner_points,
    exact_score_points = excluded.exact_score_points,
    champion_points = excluded.champion_points,
    bracket_points = excluded.bracket_points,
    correct_predictions = excluded.correct_predictions,
    total_predictions = excluded.total_predictions,
    created_at = excluded.created_at;

  return new;
end;
$$;

drop trigger if exists profiles_sync_public_leaderboard_profile
on public.profiles;

create trigger profiles_sync_public_leaderboard_profile
after insert or update of
  username,
  total_points,
  match_winner_points,
  exact_score_points,
  champion_points,
  bracket_points,
  correct_predictions,
  total_predictions
on public.profiles
for each row
execute function public.sync_public_leaderboard_profile();

drop view if exists public.leaderboard_profiles;

create view public.leaderboard_profiles
with (security_invoker = true)
as
select
  id,
  username,
  total_points,
  match_winner_points,
  exact_score_points,
  champion_points,
  bracket_points,
  correct_predictions,
  total_predictions,
  created_at
from public.public_leaderboard_profiles;


-- ---------------------------------------------------------------------
-- Safe public latest-sync surface.
-- Keeps last-sync UI working without exposing all sync_logs.
-- ---------------------------------------------------------------------

create table if not exists public.public_latest_successful_sync (
  id boolean primary key default true,
  provider text not null,
  fallback_used boolean not null default false,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  recalculated_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint public_latest_successful_sync_single_row check (id = true)
);

alter table public.public_latest_successful_sync enable row level security;

drop policy if exists "Public can read latest successful sync"
on public.public_latest_successful_sync;

create policy "Public can read latest successful sync"
on public.public_latest_successful_sync
for select
using (true);

insert into public.public_latest_successful_sync (
  id,
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
)
select
  true,
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
limit 1
on conflict (id) do update set
  provider = excluded.provider,
  fallback_used = excluded.fallback_used,
  started_at = excluded.started_at,
  finished_at = excluded.finished_at,
  inserted_count = excluded.inserted_count,
  updated_count = excluded.updated_count,
  unchanged_count = excluded.unchanged_count,
  recalculated_count = excluded.recalculated_count,
  failed_count = excluded.failed_count,
  created_at = excluded.created_at;

create or replace function public.sync_public_latest_successful_sync()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.status <> 'success' then
    return new;
  end if;

  insert into public.public_latest_successful_sync (
    id,
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
  )
  values (
    true,
    new.provider,
    new.fallback_used,
    new.started_at,
    new.finished_at,
    new.inserted_count,
    new.updated_count,
    new.unchanged_count,
    new.recalculated_count,
    new.failed_count,
    new.created_at
  )
  on conflict (id) do update set
    provider = excluded.provider,
    fallback_used = excluded.fallback_used,
    started_at = excluded.started_at,
    finished_at = excluded.finished_at,
    inserted_count = excluded.inserted_count,
    updated_count = excluded.updated_count,
    unchanged_count = excluded.unchanged_count,
    recalculated_count = excluded.recalculated_count,
    failed_count = excluded.failed_count,
    created_at = excluded.created_at
  where public.public_latest_successful_sync.finished_at <= excluded.finished_at;

  return new;
end;
$$;

drop trigger if exists sync_logs_sync_public_latest_successful_sync
on public.sync_logs;

create trigger sync_logs_sync_public_latest_successful_sync
after insert or update of status, finished_at
on public.sync_logs
for each row
execute function public.sync_public_latest_successful_sync();

drop view if exists public.latest_successful_sync;

create view public.latest_successful_sync
with (security_invoker = true)
as
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
from public.public_latest_successful_sync;


-- ---------------------------------------------------------------------
-- Bracket prediction windows.
-- Round of 32 locks June 16, 2026 00:00 GMT+3.
-- Later rounds open when their team pool is complete, then lock 24h later.
-- ---------------------------------------------------------------------

create table if not exists public.stage_prediction_windows (
  stage text primary key,
  opened_at timestamptz,
  lock_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint stage_prediction_windows_stage_check check (
    stage in (
      'round_of_32',
      'round_of_16',
      'quarter_finals',
      'semi_finals',
      'finalists'
    )
  )
);

alter table public.stage_prediction_windows enable row level security;

drop policy if exists "Anyone can read stage prediction windows"
on public.stage_prediction_windows;

create policy "Anyone can read stage prediction windows"
on public.stage_prediction_windows
for select
using (true);

insert into public.stage_prediction_windows (
  stage,
  opened_at,
  lock_at,
  updated_at
)
values (
  'round_of_32',
  '2026-01-01 00:00:00+00',
  '2026-06-16 00:00:00+03',
  now()
)
on conflict (stage) do update set
  opened_at = coalesce(public.stage_prediction_windows.opened_at, excluded.opened_at),
  lock_at = excluded.lock_at,
  updated_at = now();

create or replace function public.stage_prediction_dependency_stage(stage_name text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case public.normalize_stage_prediction_stage(stage_name)
    when 'round_of_32' then null
    when 'round_of_16' then 'round_of_32'
    when 'quarter_finals' then 'round_of_16'
    when 'semi_finals' then 'quarter_finals'
    when 'finalists' then 'semi_finals'
    else null
  end;
$$;

create or replace function public.stage_prediction_dependency_ready(stage_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  normalized_stage text;
  dependency_stage text;
  required_dependency_count integer;
  actual_dependency_count integer;
begin
  normalized_stage := public.normalize_stage_prediction_stage(stage_name);

  if normalized_stage = 'round_of_32' then
    return true;
  end if;

  dependency_stage := public.stage_prediction_dependency_stage(normalized_stage);

  if dependency_stage is null then
    return false;
  end if;

  required_dependency_count := public.stage_prediction_required_count(dependency_stage);

  select count(distinct public.team_compare_key(team_name))
  into actual_dependency_count
  from (
    select team_a as team_name
    from public.matches
    where public.normalize_match_prediction_stage(stage) = dependency_stage

    union all

    select team_b as team_name
    from public.matches
    where public.normalize_match_prediction_stage(stage) = dependency_stage
  ) teams
  where not public.is_placeholder_team_name(team_name);

  return actual_dependency_count = required_dependency_count;
end;
$$;

create or replace function public.refresh_stage_prediction_windows()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stage_name text;
  existing_opened_at timestamptz;
  next_opened_at timestamptz;
  next_lock_at timestamptz;
  first_current_stage_kickoff timestamptz;
begin
  insert into public.stage_prediction_windows (
    stage,
    opened_at,
    lock_at,
    updated_at
  )
  values (
    'round_of_32',
    '2026-01-01 00:00:00+00',
    '2026-06-16 00:00:00+03',
    now()
  )
  on conflict (stage) do update set
    opened_at = coalesce(public.stage_prediction_windows.opened_at, excluded.opened_at),
    lock_at = excluded.lock_at,
    updated_at = now();

  foreach stage_name in array array[
    'round_of_16',
    'quarter_finals',
    'semi_finals',
    'finalists'
  ]
  loop
    if public.stage_prediction_dependency_ready(stage_name) then
      select opened_at
      into existing_opened_at
      from public.stage_prediction_windows
      where stage = stage_name
      for update;

      next_opened_at := coalesce(existing_opened_at, now());
      next_lock_at := next_opened_at + interval '1 day';

      select min(match_date)
      into first_current_stage_kickoff
      from public.matches
      where public.normalize_match_prediction_stage(stage) = stage_name;

      if first_current_stage_kickoff is not null
         and first_current_stage_kickoff < next_lock_at then
        next_lock_at := first_current_stage_kickoff;
      end if;

      insert into public.stage_prediction_windows (
        stage,
        opened_at,
        lock_at,
        updated_at
      )
      values (
        stage_name,
        next_opened_at,
        next_lock_at,
        now()
      )
      on conflict (stage) do update set
        opened_at = coalesce(public.stage_prediction_windows.opened_at, excluded.opened_at),
        lock_at = excluded.lock_at,
        updated_at = now();
    else
      insert into public.stage_prediction_windows (
        stage,
        opened_at,
        lock_at,
        updated_at
      )
      values (
        stage_name,
        null,
        null,
        now()
      )
      on conflict (stage) do nothing;
    end if;
  end loop;
end;
$$;

create or replace function public.refresh_stage_prediction_windows_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.refresh_stage_prediction_windows();
  return null;
end;
$$;

drop trigger if exists matches_refresh_stage_prediction_windows
on public.matches;

create trigger matches_refresh_stage_prediction_windows
after insert or update of team_a, team_b, status, result, last_synced_at
on public.matches
for each statement
execute function public.refresh_stage_prediction_windows_trigger();

create or replace function public.stage_prediction_lock_at(stage_name text)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  normalized_stage text;
  next_lock_at timestamptz;
begin
  normalized_stage := public.normalize_stage_prediction_stage(stage_name);

  if normalized_stage is null or normalized_stage = '' then
    return null;
  end if;

  perform public.refresh_stage_prediction_windows();

  select lock_at
  into next_lock_at
  from public.stage_prediction_windows
  where stage = normalized_stage;

  return next_lock_at;
end;
$$;

create or replace function public.save_stage_prediction(
  target_stage text,
  selected_teams text[]
)
returns public.stage_predictions
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_stage text;
  required_count integer;
  stage_lock_at timestamptz;
  stage_opened_at timestamptz;
  cleaned_teams text[];
  saved_prediction public.stage_predictions;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to save bracket predictions';
  end if;

  perform public.refresh_stage_prediction_windows();

  normalized_stage := public.normalize_stage_prediction_stage(target_stage);
  required_count := public.stage_prediction_required_count(normalized_stage);

  if normalized_stage is null or required_count is null then
    raise exception 'Choose a valid bracket stage';
  end if;

  select opened_at, lock_at
  into stage_opened_at, stage_lock_at
  from public.stage_prediction_windows
  where stage = normalized_stage;

  if stage_opened_at is null then
    raise exception 'This bracket round opens after the previous round teams are known.';
  end if;

  if stage_lock_at is not null and stage_lock_at <= now() then
    raise exception 'This stage is locked';
  end if;

  select array_agg(trim(selected.team_name) order by trim(selected.team_name))
  into cleaned_teams
  from unnest(coalesce(selected_teams, '{}')) as selected(team_name)
  where trim(selected.team_name) <> '';

  cleaned_teams := coalesce(cleaned_teams, '{}');

  if cardinality(cleaned_teams) <> required_count then
    raise exception 'Select exactly % teams for this stage', required_count;
  end if;

  if (
    select count(distinct public.team_compare_key(selected.team_name))
    from unnest(cleaned_teams) as selected(team_name)
  ) <> required_count then
    raise exception 'Do not select the same team twice';
  end if;

  if exists (
    select 1
    from unnest(cleaned_teams) as selected(team_name)
    where not public.is_valid_stage_prediction_team(selected.team_name)
  ) then
    raise exception 'Choose teams from the tournament team list';
  end if;

  insert into public.stage_predictions (
    user_id,
    stage,
    selected_teams,
    locked_at
  )
  values (
    auth.uid(),
    normalized_stage,
    cleaned_teams,
    stage_lock_at
  )
  on conflict (user_id, stage) do update set
    selected_teams = excluded.selected_teams,
    locked_at = excluded.locked_at,
    correct_teams = '{}',
    points_awarded = 0,
    correct_count = 0,
    scored_at = null,
    updated_at = now()
  where public.stage_predictions.scored_at is null
    and (
      public.stage_predictions.locked_at is null
      or public.stage_predictions.locked_at > now()
    )
  returning * into saved_prediction;

  if saved_prediction.id is null then
    raise exception 'This stage is locked';
  end if;

  return saved_prediction;
end;
$$;

create or replace function public.get_live_group_predictions(target_group_id uuid)
returns table (
  match_id uuid,
  match_number integer,
  team_a text,
  team_b text,
  team_a_score integer,
  team_b_score integer,
  match_status text,
  match_date timestamptz,
  stage text,
  user_id uuid,
  username text,
  predicted_result text,
  predicted_home_score integer,
  predicted_away_score integer
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    m.id as match_id,
    m.match_number,
    m.team_a,
    m.team_b,
    m.team_a_score,
    m.team_b_score,
    m.status as match_status,
    m.match_date,
    m.stage,
    p.user_id,
    coalesce(lp.username, 'Unknown player') as username,
    p.predicted_result,
    p.predicted_home_score,
    p.predicted_away_score
  from public.groups g
  join public.group_members gm
    on gm.group_id = g.id
   and gm.status = 'accepted'
  join public.predictions p
    on p.user_id = gm.user_id
  join public.matches m
    on m.id = p.match_id
  left join public.leaderboard_profiles lp
    on lp.id = p.user_id
  where g.id = target_group_id
    and g.live_predictions_enabled = true
    and m.match_date <= now()
    and m.status in ('live', 'halftime', 'extra_time', 'penalties', 'penalty_shootout')
    and exists (
      select 1
      from public.group_members viewer_membership
      where viewer_membership.group_id = target_group_id
        and viewer_membership.user_id = auth.uid()
        and viewer_membership.status = 'accepted'
    )
  order by m.match_date, lp.username;
$$;

select public.refresh_stage_prediction_windows();


-- ---------------------------------------------------------------------
-- Function search_path hardening.
-- ---------------------------------------------------------------------

do $$
declare
  function_record record;
begin
  for function_record in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions',
      function_record.schema_name,
      function_record.function_name,
      function_record.function_args
    );
  end loop;
end;
$$;


-- ---------------------------------------------------------------------
-- Final grants.
-- Anonymous users can only read explicitly public surfaces.
-- Signed-in users can execute only RPCs needed by app features.
-- ---------------------------------------------------------------------

revoke all on public.public_leaderboard_profiles from public;
revoke all on public.public_leaderboard_profiles from anon;
revoke all on public.public_leaderboard_profiles from authenticated;

revoke all on public.public_latest_successful_sync from public;
revoke all on public.public_latest_successful_sync from anon;
revoke all on public.public_latest_successful_sync from authenticated;

revoke all on public.stage_prediction_windows from public;
revoke all on public.stage_prediction_windows from anon;
revoke all on public.stage_prediction_windows from authenticated;

revoke all on public.leaderboard_profiles from public;
revoke all on public.leaderboard_profiles from anon;
revoke all on public.leaderboard_profiles from authenticated;

revoke all on public.latest_successful_sync from public;
revoke all on public.latest_successful_sync from anon;
revoke all on public.latest_successful_sync from authenticated;

grant select on public.public_leaderboard_profiles to anon, authenticated;
grant select on public.public_latest_successful_sync to anon, authenticated;
grant select on public.stage_prediction_windows to anon, authenticated;
grant select on public.leaderboard_profiles to anon, authenticated;
grant select on public.latest_successful_sync to anon, authenticated;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

grant execute on all functions in schema public to service_role;

grant execute on function public.set_world_cup_winner_prediction(text)
to authenticated;

grant execute on function public.save_stage_prediction(text, text[])
to authenticated;

grant execute on function public.create_private_group(text, text)
to authenticated;

grant execute on function public.delete_private_group(uuid)
to authenticated;

grant execute on function public.join_group_by_invite_code(text)
to authenticated;

grant execute on function public.invite_group_member(uuid, uuid)
to authenticated;

grant execute on function public.respond_group_invitation(uuid, text)
to authenticated;

grant execute on function public.remove_group_member(uuid, uuid)
to authenticated;

grant execute on function public.leave_group(uuid)
to authenticated;

grant execute on function public.regenerate_group_invite_code(uuid)
to authenticated;

grant execute on function public.update_group_details(uuid, text, text)
to authenticated;

grant execute on function public.update_group_live_predictions_setting(uuid, boolean)
to authenticated;

grant execute on function public.get_live_group_predictions(uuid)
to authenticated;

grant execute on function public.search_profiles_for_invite(uuid, text)
to authenticated;

grant execute on function public.is_admin(uuid)
to authenticated;

grant execute on function public.is_group_member(uuid, uuid)
to authenticated;

grant execute on function public.can_manage_group(uuid, uuid)
to authenticated;

-- Keep public table reads explicitly granted.
grant select on public.matches to anon, authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select on public.group_invitations to authenticated;
grant select on public.world_cup_winner_predictions to authenticated;
grant select on public.stage_predictions to authenticated;
