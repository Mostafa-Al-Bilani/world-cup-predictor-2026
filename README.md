# World Cup Predictor 2026

FIFA World Cup 2026 prediction website where users register, predict match outcomes and exact scores, pick a tournament champion, earn points, and compete on public or private leaderboards.

Live website: [https://mostafa-al-bilani.github.io/world-cup-predictor-2026/](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

This is a fan project. It does not use official FIFA logos, mascots, protected graphics, or branding.

## Features

- Supabase email/password registration and login.
- Automatic profile rows after registration.
- Match browsing with search, stage filters, status filters, and responsive fixture cards.
- One prediction per user per match with result, optional exact score, duplicate prevention, and UTC kickoff locking.
- Group-stage draw predictions and knockout final-winner predictions.
- Locked World Cup champion pick worth 3 tournament points.
- Bracket predictions for pre-round advancement picks through the knockout stages.
- Public Supabase-backed scoreboard with top-three podium, rank table, point breakdown, accuracy, and current-user highlight.
- My Predictions dashboard with status filters, exact score picks, champion pick, bracket prompt, and earned points.
- Private friend groups with invite codes, invitations, members-only leaderboards, and owner controls.
- Admin-only dashboard for adding, editing, deleting, finishing, and recalculating matches.
- Admin-only Sync Fixtures button using openfootball World Cup 2026 JSON data.
- Scheduled server-side fixture/result/live-status sync using ESPN's no-key public scoreboard feed by default, with openfootball fallback.
- Optional API-Football/API-SPORTS provider support for paid plans that include World Cup 2026.
- Persistent fixture sync logs with admin status summaries and public scoreboard last-updated text.
- Timezone-aware kickoff display with admin local-time editing and UTC Supabase storage.
- GitHub Pages-safe routing through `HashRouter`.
- Official GitHub Pages deployment workflow using Pages artifacts.

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase Auth, Postgres, RPC functions, triggers, and Row Level Security
- React Router `HashRouter`
- GitHub Actions + GitHub Pages hosting

## Environment Variables

Create `.env` locally from `.env.example`:

```bash
npm install
cp .env.example .env
```

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026

# Server-side fixture sync only. Never expose these in React.
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
FIXTURE_PROVIDER=espn
# FOOTBALL_API_KEY=your-optional-api-sports-football-key
# FOOTBALL_API_HOST=https://v3.football.api-sports.io
```

Local development can run without Supabase values and will use demo localStorage data. Production builds do not allow demo accounts, demo predictions, or demo scoreboard data. If Supabase variables are missing in production, the app shows a visible configuration error.

The `VITE_` variables are safe frontend build values. `SUPABASE_SERVICE_ROLE_KEY` is private server-side data for GitHub Actions only. `FOOTBALL_API_KEY` is optional and must stay server-side if you switch to the API-Football provider.

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
- `matches`: fixtures, live/final status, scores, result, venue, elapsed time, halftime score, and external fixture references.
- `predictions`: one prediction per user per match, including result pick, optional exact score, and trusted point fields.
- `world_cup_winner_predictions`: one locked champion pick per user.
- `stage_predictions`: one bracket advancement prediction per user per knockout stage.
- `sync_logs`: provider sync audit trail for scheduled and manual fixture syncs.
- `groups`: private prediction groups with owners and invite codes.
- `group_members`: accepted group members and roles.
- `group_invitations`: pending, accepted, and declined user invitations.
- `leaderboard_profiles`: public scoreboard view without profile emails.
- `latest_successful_sync`: public-safe view used for scoreboard last-updated text.
- `recalculate_match_points(target_match_id uuid)`: admin/service-role point recalculation for finished matches.
- `recalculate_champion_points()`: admin/service-role champion point recalculation after the final.
- `set_world_cup_winner_prediction(team_name text)`: authenticated champion-pick RPC that locks the pick after selection.
- `save_stage_prediction(target_stage text, selected_teams text[])`: authenticated bracket prediction RPC with count/team/lock validation.
- `recalculate_stage_prediction_points(target_stage text default null)`: admin/service-role bracket point recalculation.

RLS is enabled on all core tables. Users can manage only their own unlocked predictions. Users cannot update trusted point fields from the browser. Admins and service-role sync logic can manage matches and recalculate points.

Private group data is protected with RLS:

- users can read groups only when they are accepted members or owners;
- users can read their own invitations;
- accepted members can read the member list for their group;
- writes use Supabase RPC functions for create, join, invite, accept/decline, leave, remove, update, regenerate code, and delete;
- regular users cannot add themselves to a private group without a valid invite code or invitation.

If you already ran an older schema, rerun the latest `supabase/schema.sql`. It uses `add column if not exists` and `create table if not exists` for the new sync fields/logs, score prediction fields, champion prediction table, bracket prediction table, and private group tables.

## Scoring Rules

Each match can award up to 2 points:

- Correct match winner/result: `1` point.
- Exact score bonus: `1` extra point.
- Winner correct but score wrong or missing: `1` point.
- Winner wrong: `0` points, even if one score number matches.
- Exact score bonus requires both predicted score numbers to match the final score exactly.

Existing predictions without exact score fields remain valid. They can still earn the winner/result point after recalculation.

For group-stage matches, draw is a valid prediction. For knockout matches, users predict the final winner. If a knockout match is decided after extra time or penalties, the app scores the final winner from provider/admin data. The displayed score is the provider/admin final listed score.

The World Cup champion pick is separate:

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

## Private Groups

Logged-in users can open **Groups** from the navigation.

Users can:

- create a private group;
- join a group with an invite code or invite link;
- view groups they belong to;
- accept or decline pending invitations;
- leave groups they do not own.

Group owners can:

- rename the group and edit its description;
- copy an invite code or invite link;
- regenerate the invite code;
- search existing users by username or email and send invitations;
- remove members;
- delete the group.

Only accepted members appear in a group leaderboard. The group leaderboard uses the same `leaderboard_profiles` totals as the public scoreboard, including bracket points, filtered to accepted members of that group.

## Timezone Handling

Supabase stores `matches.match_date` as `timestamptz` in UTC. Public pages display kickoff times in the visitor's local timezone with a timezone abbreviation. The Admin Match form uses the admin browser's local timezone for `datetime-local` editing and shows the UTC value that will be saved.

## Fixture Sync

There are two sync paths:

1. Scheduled server-side sync through GitHub Actions.
2. Admin manual fallback sync from the Admin Dashboard.

### Scheduled ESPN Sync

The workflow `.github/workflows/sync-fixtures.yml` runs every four hours as a baseline and can also be started manually from GitHub Actions. During the expected World Cup match window, it also runs hourly:

- June 11-30, 2026
- July 1-19, 2026

GitHub Actions scheduled jobs are not guaranteed to start at the exact minute. This is near-live sync, not real-time streaming.

It runs:

```bash
npm run sync:fixtures
```

The server script reads:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIXTURE_PROVIDER
FOOTBALL_API_KEY       # optional, only if FIXTURE_PROVIDER=api-football
FOOTBALL_API_HOST      # optional, only if FIXTURE_PROVIDER=api-football
```

Default provider:

```text
FIXTURE_PROVIDER=espn
```

The default provider is ESPN's public World Cup scoreboard feed:

```text
https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

It does not require an API key and currently returns the full 2026 World Cup event list with kickoff times, venues, match status, elapsed time, live score, final score, and winner flags. It is still a public third-party feed, not an official FIFA real-time API with an uptime SLA.

If ESPN fails, the script falls back to openfootball and records `fallback_used = true` in `sync_logs`. openfootball is fixture-oriented and should not be treated as live score coverage.

API-Football/API-SPORTS support remains available by setting:

```text
FIXTURE_PROVIDER=api-football
FOOTBALL_API_HOST=https://v3.football.api-sports.io
FOOTBALL_API_KEY=your-server-side-key
```

API-Football free plans may not include World Cup 2026. If your plan returns a season access error, keep `FIXTURE_PROVIDER=espn`.

The script:

- validates required server environment variables;
- never prints secrets;
- normalizes provider data into the existing `matches` table;
- matches existing rows by provider fixture id, external reference, match number, date, canonical stage/team aliases, and team names;
- matches knockout placeholder fixtures by kickoff and stage so labels like `2A` and `Group A 2nd Place` do not create duplicate cards;
- deletes no-prediction duplicate match rows created by previous provider placeholder mismatches;
- avoids overwriting useful existing values with null or empty provider values;
- inserts new matches;
- updates changed kickoff time, teams, stage, status, elapsed time, halftime score, venue, city, score, and result;
- detects newly finished or changed-result matches;
- calls `recalculate_match_points` only for affected finished matches;
- calls `recalculate_stage_prediction_points` after sync so eligible bracket stages are scored;
- does not award points while a match is live or at halftime;
- writes a persistent `sync_logs` row.

You can dry-run a provider without Supabase writes:

```bash
npm run sync:fixtures -- --dry-run --provider espn
```

API rate limits matter if you use a paid provider. Keep `FOOTBALL_API_KEY` server-side in GitHub secrets, do not expose it as a `VITE_` variable, and adjust schedule frequency if your provider plan cannot support hourly tournament refreshes.

If true real-time updates are required later, use a backend worker or Supabase Edge Function scheduled job. GitHub Actions cron is useful for near-live updates, but it is not a guaranteed real-time service.

### Manual openfootball Sync

Admins can click **Sync Fixtures** in the Admin Dashboard as a backup.

The sync fetches:

`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`

It does not require an API key. It normalizes fixtures, matches existing rows by provider metadata, `external_ref`, match number, date, and team names, then:

- updates changed date, teams, stage, status, venue, city, host country, score, and result fields;
- inserts newly available fixtures;
- recalculates points for affected finished matches;
- writes a sync log;
- keeps manual admin add/edit/delete functionality.

openfootball is a free public dataset, not a guaranteed real-time official FIFA API. It remains useful as a no-key fallback.

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
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIXTURE_PROVIDER
FOOTBALL_API_KEY     # optional, only for API-Football
FOOTBALL_API_HOST    # optional, only for API-Football
```

`VITE_GITHUB_REPOSITORY_NAME` should match the repository name so Vite builds assets with the correct base path.

Use repository **secrets** for `SUPABASE_SERVICE_ROLE_KEY` and any optional `FOOTBALL_API_KEY`. Do not put them in React code and do not prefix them with `VITE_`.

The workflow `.github/workflows/deploy.yml` runs on pushes to `main`, builds with `npm run build`, uploads `dist`, and deploys with:

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

The scheduled fixture sync workflow is separate from deployment. It does not rebuild the site; it updates Supabase data directly with the service role key.

## Future Improvements

- Use `SECURITY.md` and `docs/security-checklist.md` before each production deploy.
- Add advanced group privacy controls and ownership transfer.
- Add CSV export for admin scoring audits.
- Add richer match detail pages.
- Add prediction reminders before kickoff.
- Add deeper provider reconciliation for group names and knockout placeholders if provider formats change.
