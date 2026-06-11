# World Cup Predictor 2026

FIFA World Cup 2026 prediction website where users register, predict match outcomes and exact scores, pick a tournament champion, earn points, and compete on public or private leaderboards.

Live website: [https://mostafa-al-bilani.github.io/world-cup-predictor-2026/](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

This is a fan project. It does not use official FIFA logos, mascots, protected graphics, or branding.

## Features

- Supabase email/password registration and login.
- Automatic profile rows after registration.
- Match browsing with search, stage filters, status filters, and responsive fixture cards.
- One prediction per user per match with result, exact score, duplicate prevention, and UTC kickoff locking.
- Group-stage draw predictions and knockout final-winner predictions.
- Locked World Cup champion pick worth 3 tournament points.
- Bracket predictions for pre-round advancement picks through the knockout stages.
- Public Supabase-backed scoreboard with top-three podium, rank table, point breakdown, accuracy, and current-user highlight.
- Scoreboard total points combine match winner points, exact score points, champion points, and bracket points.
- Accuracy is based on finished-match predictions only, so future predictions do not lower the percentage.
- My Predictions dashboard with status filters, exact score picks, champion pick, bracket prompt, and earned points.
- Private friend groups with invite codes, invitations, members-only leaderboards, live group prediction visibility, and owner controls.
- Admin-only dashboard for adding, editing, deleting, finishing, and recalculating matches.
- Admin-only Sync Fixtures button using openfootball World Cup 2026 JSON data as a backup.
- Scheduled Supabase Edge Function sync using ESPN's no-key public scoreboard feed.
- Supabase `pg_cron` job calls the Edge Function every minute during the tournament sync window.
- Persistent fixture sync logs with status summaries and public scoreboard last-updated text.
- Timezone-aware kickoff display with admin local-time editing and UTC Supabase storage.
- GitHub Pages-safe routing through `HashRouter`.
- Official GitHub Pages deployment workflow using Pages artifacts.

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase Auth, Postgres, RPC functions, triggers, and Row Level Security
- Supabase Edge Functions for server-side ESPN sync
- Supabase `pg_cron` and `pg_net` for scheduled Edge Function calls
- React Router `HashRouter`
- GitHub Actions + GitHub Pages hosting

## Environment Variables

Create `.env` locally from `.env.example`:

```bash
npm install
cp .env.example .env
```

Frontend build values:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

The `VITE_` variables are safe frontend build values. They are included in the browser bundle by design.

Server-side secrets must never be placed in React code and must never use the `VITE_` prefix.

Supabase Edge Function secret:

```bash
SERVICE_ROLE_KEY=your-private-service-role-key
```

Supabase automatically provides `SUPABASE_URL` to Edge Functions. The Edge Function reads `SERVICE_ROLE_KEY` for privileged database updates.

Optional server-side variables for local/server scripts:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
FIXTURE_PROVIDER=espn
# FOOTBALL_API_KEY=your-optional-api-sports-football-key
# FOOTBALL_API_HOST=https://v3.football.api-sports.io
```

Local development can run without Supabase values and will use demo localStorage data. Production builds do not allow demo accounts, demo predictions, or demo scoreboard data. If Supabase variables are missing in production, the app shows a visible configuration error.

## Run Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

Run lightweight tests:

```bash
npm run test
```

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql` if you want starter fixtures before using the admin sync.
5. Register a user through the app.
6. Make that user an admin:

```sql
update public.profiles
set is_admin = true
where email = 'your-email@example.com';
```

The schema creates:

- `profiles`: user profile, admin flag, and scoreboard totals.
- `public_leaderboard_profiles`: public-safe scoreboard table without profile emails/admin fields.
- `matches`: fixtures, live/final status, scores, result, venue, elapsed time, halftime score, and provider fixture references.
- `predictions`: one prediction per user per match, including result pick, exact score, and trusted point fields.
- `world_cup_winner_predictions`: one locked champion pick per user.
- `stage_predictions`: one bracket advancement prediction per user per knockout stage.
- `sync_logs`: provider sync audit trail for scheduled and manual fixture syncs.
- `public_latest_successful_sync`: public-safe latest successful sync row for UI display.
- `groups`: private prediction groups with owners, invite codes, and live prediction settings.
- `group_members`: accepted group members and roles.
- `group_invitations`: pending, accepted, and declined user invitations.
- `leaderboard_profiles`: public scoreboard view backed by `public_leaderboard_profiles`.
- `latest_successful_sync`: public-safe view used for scoreboard last-updated text.
- `recalculate_match_points(target_match_id uuid)`: service-role/admin point recalculation for finished matches.
- `recalculate_champion_points()`: service-role/admin champion point recalculation after the final.
- `set_world_cup_winner_prediction(team_name text)`: authenticated champion-pick RPC that locks the pick after selection.
- `save_stage_prediction(target_stage text, selected_teams text[])`: authenticated bracket prediction RPC with count/team/lock validation.
- `recalculate_stage_prediction_points(target_stage text default null)`: service-role/admin bracket point recalculation.

RLS is enabled on all core tables. Users can manage only their own unlocked predictions. Users cannot update trusted point fields from the browser. Admins and service-role sync logic can manage matches and recalculate points.

Private group data is protected with RLS:

- users can read groups only when they are accepted members or owners;
- users can read their own invitations;
- accepted members can read the member list for their group;
- writes use Supabase RPC functions for create, join, invite, accept/decline, leave, remove, update, regenerate code, live prediction settings, and delete;
- regular users cannot add themselves to a private group without a valid invite code or invitation.

If you already ran an older schema, rerun the latest `supabase/schema.sql`. It uses `add column if not exists`, `create table if not exists`, and replacement functions/triggers so the database can be upgraded safely without dropping existing app data.

## Scoring Rules

Each match can award up to 2 points:

- Correct match winner/result: `1` point.
- Exact score bonus: `1` extra point.
- Winner correct but score wrong: `1` point.
- Winner wrong: `0` points, even if one score number matches.
- Exact score bonus requires both predicted score numbers to match the final score exactly.

For group-stage matches, draw is a valid prediction. For knockout matches, users predict the final winner. If a knockout match is decided after extra time or penalties, the app scores the final winner from provider/admin data. The displayed score is the provider/admin final listed score.

Champion pick:

- Users pick the team they think will win the tournament.
- New users choose during registration when a session is available, otherwise on first login.
- Existing non-admin users without a champion pick are prompted on next login before continuing.
- The pick locks after first selection.
- Correct champion pick: `3` points.
- Champion points are added to the same leaderboard totals as match points.

Bracket predictions are optional pre-round advancement picks. Users can save one prediction per stage before that stage starts:

- Round of 32: select `32` teams, `1` point per correct team.
- Round of 16: select `16` teams, `2` points per correct team.
- Quarter-finals: select `8` teams, `3` points per correct team.
- Semi-finals: select `4` teams, `4` points per correct team.
- Finalists: select `2` teams, `5` points per correct team.

Each bracket stage locks at the UTC kickoff timestamp of the first match in that stage. The UI displays that lock time in the visitor's local timezone. If a stage has no scheduled matches yet, the UI shows that it locks when the stage begins.

Bracket scoring uses synced fixture data: once the actual non-placeholder teams appear in that stage's matches, `recalculate_stage_prediction_points` compares saved teams to actual teams and overwrites `points_awarded` idempotently. It does not infer from placeholders and does not score incomplete stages.

Champion scoring remains the existing `3` point champion pick. It is not duplicated inside bracket predictions.

Profile totals include:

- `match_winner_points`
- `exact_score_points`
- `champion_points`
- `bracket_points`
- `total_points`

`total_points` is calculated as:

```text
total_points = match_winner_points + exact_score_points + champion_points + bracket_points
```

`correct_predictions` and `total_predictions` are used for accuracy. `total_predictions` should represent finished match predictions counted for accuracy, not all future predictions.

## Private Groups

Logged-in users can open **Groups** from the navigation.

Users can:

- create a private group;
- join a group with an invite code or invite link;
- view groups they belong to;
- accept or decline pending invitations;
- leave groups they do not own;
- view group leaderboards;
- view live group predictions when the group owner enables that setting.

Group owners can:

- rename the group and edit its description;
- copy an invite code or invite link;
- regenerate the invite code;
- search existing users by username or email and send invitations;
- enable or disable live group predictions;
- remove members;
- delete the group.

Only accepted members appear in a group leaderboard. The group leaderboard uses the same `leaderboard_profiles` totals as the public scoreboard, including bracket points, filtered to accepted members of that group.

## Timezone Handling

Supabase stores `matches.match_date` as `timestamptz` in UTC. Public pages display kickoff times in the visitor's local timezone with a timezone abbreviation. The Admin Match form uses the admin browser's local timezone for `datetime-local` editing and shows the UTC value that will be saved.

## Fixture Sync

There are three sync paths:

1. **Primary scheduled sync:** Supabase Edge Function `sync-live-matches`, called by `pg_cron` every minute.
2. **Admin manual backup:** Admin Dashboard openfootball sync.
3. **Optional local/server script:** `npm run sync:fixtures` for manual provider dry runs or GitHub Actions if configured.

### Supabase Edge Function ESPN Sync

The repository keeps the Edge Function source at:

```text
supabase/functions/sync-live-matches/index.ts
supabase/functions/deno.json
```

Do not delete these files unless the deployed Supabase Edge Function is intentionally removed from the project.

Deploy the function:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set SERVICE_ROLE_KEY=your-private-service-role-key
npx supabase functions deploy sync-live-matches
```

The function reads:

```text
SUPABASE_URL       # provided automatically by Supabase Edge Functions
SERVICE_ROLE_KEY   # set manually as a Supabase function secret
ESPN_SCOREBOARD_URL # optional override
```

Default ESPN endpoint:

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

The function:

- selects candidate matches from 4 hours in the past to 24 hours in the future;
- skips matches with status `finished`, `cancelled`, or `postponed`;
- syncs live matches frequently;
- syncs matches close to kickoff more often;
- syncs matches 2-24 hours before kickoff less frequently;
- fetches ESPN scoreboard data by date;
- matches events by provider fixture id first, then by kickoff time and normalized team names;
- updates match status, scores, result, elapsed time, status detail, venue, city, provider metadata, and sync timestamp;
- recalculates points when a match becomes finished;
- recalculates eligible bracket stages after match sync;
- writes a persistent `sync_logs` row.

ESPN can omit some upcoming fixtures from the scoreboard endpoint even when a stored provider fixture id exists. Missing ESPN data for an upcoming match should be treated as unchanged/skipped, not a full sync failure. Missing data for a live or near-kickoff match can still be treated as a warning/failure.

### Supabase Cron Job

The cron job is created with `pg_cron` and `pg_net` and calls the deployed Edge Function every minute.

Required extensions:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Example cron job:

```sql
select cron.schedule(
  'sync-live-matches-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-live-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <anon-or-service-token>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

`pg_cron` supports minute-level scheduling. It does not run every 30 seconds. During live matches, the practical backend ESPN sync interval is about one minute.

To check cron health:

```sql
select
  j.jobid,
  j.jobname,
  j.schedule,
  j.active,
  r.status as cron_status,
  r.return_message,
  r.start_time,
  r.end_time,
  r.end_time - r.start_time as duration
from cron.job j
left join lateral (
  select *
  from cron.job_run_details r
  where r.jobid = j.jobid
  order by r.start_time desc
  limit 1
) r on true
where j.jobname = 'sync-live-matches-every-minute';
```

To check recent ESPN sync logs:

```sql
select
  provider,
  status,
  started_at,
  finished_at,
  updated_count,
  unchanged_count,
  recalculated_count,
  failed_count,
  error_message
from public.sync_logs
where provider = 'espn'
order by started_at desc
limit 10;
```

Healthy recent rows should show:

```text
status = success
failed_count = 0
error_message = null
```

### Manual openfootball Sync

Admins can click **Sync Fixtures** in the Admin Dashboard as a backup.

The sync fetches:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

It does not require an API key. It normalizes fixtures, matches existing rows by provider metadata, `external_ref`, match number, date, and team names, then:

- updates changed date, teams, stage, status, venue, city, host country, score, and result fields;
- inserts newly available fixtures;
- recalculates points for affected finished matches;
- writes a sync log;
- keeps manual admin add/edit/delete functionality.

openfootball is a free public dataset, not a guaranteed real-time official FIFA API. It remains useful as a no-key fallback.

### Optional Fixture Sync Script

The optional script can dry-run a provider without Supabase writes:

```bash
npm run sync:fixtures -- --dry-run --provider espn
```

If this script is configured in GitHub Actions, store these values as GitHub secrets or variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIXTURE_PROVIDER
FOOTBALL_API_KEY       # optional, only if FIXTURE_PROVIDER=api-football
FOOTBALL_API_HOST      # optional, only if FIXTURE_PROVIDER=api-football
```

API-Football/API-SPORTS support remains available by setting:

```text
FIXTURE_PROVIDER=api-football
FOOTBALL_API_HOST=https://v3.football.api-sports.io
FOOTBALL_API_KEY=your-server-side-key
```

API-Football free plans may not include World Cup 2026. If your plan returns a season access error, keep `FIXTURE_PROVIDER=espn`.

API rate limits matter if you use a paid provider. Keep `FOOTBALL_API_KEY` server-side, do not expose it as a `VITE_` variable, and adjust schedule frequency if your provider plan cannot support frequent tournament refreshes.

## Supabase Auth Redirect URLs

In Supabase Auth URL settings, use the GitHub Pages base URL as the Site URL:

```text
https://<github-username>.github.io/<repository-name>/
```

Add these Redirect URLs:

```text
http://localhost:5173/
http://localhost:5173/#/login
http://localhost:5173/#/reset-password
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/login
https://<github-username>.github.io/<repository-name>/#/reset-password
```

Email confirmation redirects to `#/login`. Password recovery redirects to the app base URL, then the app detects the recovery session and sends the user to `#/reset-password`.

The repository also includes `public/404.html` as a GitHub Pages SPA fallback. If an auth provider sends a clean path such as `/login`, GitHub Pages redirects it back into the hash router instead of showing a Pages 404.

If signup confirmation emails do not arrive:

- Use the **Resend confirmation email** button shown after registration.
- Check the mailbox spam/junk folder and Supabase Auth email logs.
- In Supabase, confirm **Authentication -> Emails** is enabled for confirmation emails.
- If the default Supabase sender is delayed or filtered, configure a custom SMTP provider.
- Keep `https://<github-username>.github.io/<repository-name>/#/login` in the redirect allow list.

## Password Reset

The login page includes a **Forgot your password?** link.

Flow:

1. The user enters their email on `#/forgot-password`.
2. Supabase sends a recovery email.
3. The recovery link redirects back to the GitHub Pages app base URL.
4. The app detects the Supabase recovery session and sends the user to `#/reset-password`.
5. The user chooses a new password and logs in again.

Make sure the Supabase Auth redirect URLs include the GitHub Pages base URL exactly:

```text
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/reset-password
```

## GitHub Pages Deployment

This project uses GitHub Pages only. It does not use Vercel, Netlify, Render, Railway, Firebase Hosting, or the `gh-pages` package.

1. Push the repository to GitHub.
2. In GitHub, open Settings -> Pages.
3. Set Source to **GitHub Actions**.
4. Add repository secrets or variables under Settings -> Secrets and variables -> Actions:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GITHUB_REPOSITORY_NAME
```

`VITE_GITHUB_REPOSITORY_NAME` should match the repository name so Vite builds assets with the correct base path.

Use repository **secrets** for any server-side sync keys only if you configure the optional fixture sync workflow. Do not put service-role keys in React code and do not prefix them with `VITE_`.

The workflow `.github/workflows/deploy.yml` runs on pushes to `main`, builds with `npm run build`, uploads `dist`, and deploys with:

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

The Supabase Edge Function sync is separate from deployment. It does not rebuild the site; it updates Supabase data directly with the service role key.

## Repository Hygiene

The `supabase/.temp/` directory is Supabase CLI local cache data and should not be tracked. Keep this in `.gitignore`:

```gitignore
supabase/.temp/
```

If temp files were committed before they were ignored, remove them from Git tracking without deleting local files:

```bash
git rm -r --cached supabase/.temp
git commit -m "Stop tracking Supabase temp files"
```

Do not remove `supabase/functions/sync-live-matches/index.ts` or `supabase/functions/deno.json` unless the deployed Edge Function is intentionally retired.

## Future Improvements

- Use `SECURITY.md` and `docs/security-checklist.md` before each production deploy.
- Add advanced group privacy controls and ownership transfer.
- Add CSV export for admin scoring audits.
- Add richer match detail pages.
- Add prediction reminders before kickoff.
- Add deeper provider reconciliation for group names and knockout placeholders if provider formats change.
