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
5. run application tests;
6. verify public leaderboard and sync views;
7. verify predictions can still be saved before kickoff;
8. verify trusted scoring fields remain protected.

The schema uses conditional creation and replacement definitions so existing data can normally be preserved.

## Main schema areas

The schema includes:

- user profiles;
- public-safe leaderboard data;
- matches;
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

## Optional scheduler extensions

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

These extensions are only needed when scheduling the Edge Function from Supabase.
