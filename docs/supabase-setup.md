# Supabase Setup

## Create the project

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the complete schema:

```text
supabase/schema.sql
```

4. Optionally load the repository schedule:

```text
supabase/seed.sql
```

The seed file contains 104 matches, including group-stage fixtures and placeholder knockout fixtures.

## Frontend configuration

Add to `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

## Create an admin

Register normally through the application, then run:

```sql
update public.profiles
set is_admin = true
where email = 'your-email@example.com';
```

Log out and back in after changing the admin flag.

## Schema upgrades

When updating an existing project:

1. back up the database;
2. test on a staging project when possible;
3. run the latest `supabase/schema.sql`;
4. verify RLS and function grants;
5. deploy the matching Edge Function revision;
6. run application tests;
7. verify public leaderboard and sync views;
8. verify predictions can still be saved before kickoff;
9. verify trusted scoring fields remain protected.

The schema uses conditional creation and replacement definitions so existing data can normally be preserved.

### Goal-event upgrade

The live goal timeline requires:

```text
matches.goal_events jsonb
```

The latest schema adds it safely with `add column if not exists`.

Verify:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'matches'
  and column_name = 'goal_events';
```

Expected data type:

```text
jsonb
```

Apply this schema update before deploying the current `sync-live-matches` Edge Function.

## Main schema areas

The schema includes:

- user profiles;
- public-safe leaderboard data;
- matches and live goal events;
- predictions;
- champion predictions;
- bracket predictions;
- bracket windows;
- private groups;
- memberships;
- invitations;
- synchronization logs;
- public-safe latest-sync data;
- scoring functions;
- group RPC functions;
- validation triggers;
- RLS policies;
- explicit grants.

## Important validation

The database validates:

- authenticated prediction ownership;
- match status;
- kickoff lock;
- placeholder teams;
- score completeness;
- score/result consistency;
- group-stage draw rules;
- bracket stage counts;
- duplicate bracket teams;
- bracket windows;
- trusted point fields.

Client-side checks are for immediate feedback. Database checks remain authoritative.

## Edge Function secret

Set:

```bash
npx supabase secrets set SERVICE_ROLE_KEY=your-private-service-role-key
```

Supabase provides `SUPABASE_URL` automatically to deployed Edge Functions.

Optional override:

```bash
npx supabase secrets set ESPN_SCOREBOARD_URL=https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

Deploy:

```bash
npx supabase functions deploy sync-live-matches
```

## Optional scheduler extensions

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

These extensions are only needed when scheduling the Edge Function from Supabase.
