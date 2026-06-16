-- Google OAuth onboarding: nullable usernames, optional profile metadata,
-- case-insensitive username uniqueness, and secure username assignment RPC.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text;

alter table public.profiles
  alter column username drop not null;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(trim(username)))
  where username is not null and trim(username) <> '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_name text := coalesce(new.raw_app_meta_data->>'provider', 'email');
  metadata_username text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  profile_username text;
  profile_full_name text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  )), '');
  profile_avatar_url text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  )), '');
begin
  if metadata_username is not null then
    profile_username := metadata_username;
  elsif provider_name = 'email' then
    profile_username := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  else
    profile_username := null;
  end if;

  insert into public.profiles (id, username, email, full_name, avatar_url)
  values (
    new.id,
    profile_username,
    coalesce(new.email, ''),
    profile_full_name,
    profile_avatar_url
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_public_leaderboard_profile()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.username is null or trim(new.username) = '' then
    delete from public.public_leaderboard_profiles
    where id = new.id;
    return new;
  end if;

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

create or replace function public.ensure_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.profiles;
  auth_user auth.users;
  provider_name text;
  metadata_username text;
  profile_username text;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to create a profile';
  end if;

  select *
  into existing
  from public.profiles
  where id = auth.uid();

  if existing.id is not null then
    return existing;
  end if;

  select *
  into auth_user
  from auth.users
  where id = auth.uid();

  if auth_user.id is null then
    raise exception 'Authenticated user not found';
  end if;

  provider_name := coalesce(auth_user.raw_app_meta_data->>'provider', 'email');
  metadata_username := nullif(trim(coalesce(auth_user.raw_user_meta_data->>'username', '')), '');

  if metadata_username is not null then
    profile_username := metadata_username;
  elsif provider_name = 'email' then
    profile_username := nullif(split_part(coalesce(auth_user.email, ''), '@', 1), '');
  else
    profile_username := null;
  end if;

  insert into public.profiles (id, username, email, full_name, avatar_url)
  values (
    auth_user.id,
    profile_username,
    coalesce(auth_user.email, ''),
    nullif(trim(coalesce(
      auth_user.raw_user_meta_data->>'full_name',
      auth_user.raw_user_meta_data->>'name',
      ''
    )), ''),
    nullif(trim(coalesce(
      auth_user.raw_user_meta_data->>'avatar_url',
      auth_user.raw_user_meta_data->>'picture',
      ''
    )), '')
  )
  on conflict (id) do nothing;

  select *
  into existing
  from public.profiles
  where id = auth.uid();

  return existing;
end;
$$;

create or replace function public.set_profile_username(target_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  saved public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to set a username';
  end if;

  normalized := trim(coalesce(target_username, ''));

  if normalized = '' or length(normalized) > 40 then
    raise exception 'Username must be between 1 and 40 characters';
  end if;

  if normalized !~ '^[A-Za-z0-9][A-Za-z0-9._-]*$' then
    raise exception 'Username contains invalid characters';
  end if;

  if exists (
    select 1
    from public.profiles
    where lower(trim(username)) = lower(normalized)
      and id <> auth.uid()
  ) then
    raise exception 'Username is already taken';
  end if;

  update public.profiles
  set username = normalized
  where id = auth.uid()
    and (username is null or trim(username) = '')
  returning * into saved;

  if saved.id is null then
    select *
    into saved
    from public.profiles
    where id = auth.uid();

    if saved.id is null then
      raise exception 'Profile not found';
    end if;

    if lower(trim(saved.username)) <> lower(normalized) then
      raise exception 'Username is already set';
    end if;
  end if;

  return saved;
end;
$$;

revoke all on function public.ensure_user_profile() from public;
revoke all on function public.set_profile_username(text) from public;

grant execute on function public.ensure_user_profile() to authenticated;
grant execute on function public.set_profile_username(text) to authenticated;
