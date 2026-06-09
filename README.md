# World Cup Predictor 2026

FIFA World Cup 2026 prediction website where users register, predict match outcomes, earn points for correct results, and compete on a public scoreboard.

Live website: [https://mostafa-al-bilani.github.io/world-cup-predictor-2026/](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

This is a fan project. It does not use official FIFA logos, mascots, protected graphics, or branding.

## Features

- Supabase email/password registration and login.
- Automatic profile rows after registration.
- Match browsing with search, stage filters, status filters, and responsive fixture cards.
- One prediction per user per match with duplicate prevention.
- Prediction locking after kickoff or when a match is no longer upcoming.
- Public Supabase-backed scoreboard with top-three podium, rank table, accuracy, and current-user highlight.
- My Predictions dashboard with status filters and earned points.
- Private friend groups with invite codes, invitations, members-only leaderboards, and owner controls.
- Admin-only dashboard for adding, editing, deleting, finishing, and recalculating matches.
- Admin-only Sync Fixtures button using openfootball World Cup 2026 JSON data.
- Scheduled server-side fixture/result sync using API-Football as the primary provider and openfootball as fallback.
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
FOOTBALL_API_KEY=your-api-sports-football-key
FOOTBALL_API_HOST=https://v3.football.api-sports.io
FIXTURE_PROVIDER=api-football
```

Local development can run without Supabase values and will use demo localStorage data. Production builds do not allow demo accounts, demo predictions, or demo scoreboard data. If Supabase variables are missing in production, the app shows a visible configuration error.

The `VITE_` variables are safe frontend build values. `SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_API_KEY` are private server-side values for GitHub Actions only.

## Run Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
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
- `matches`: fixtures, status, scores, result, venue, and external fixture references.
- `predictions`: one prediction per user per match.
- `sync_logs`: provider sync audit trail for scheduled and manual fixture syncs.
- `groups`: private prediction groups with owners and invite codes.
- `group_members`: accepted group members and roles.
- `group_invitations`: pending, accepted, and declined user invitations.
- `leaderboard_profiles`: public scoreboard view without profile emails.
- `latest_successful_sync`: public-safe view used for scoreboard last-updated text.
- `recalculate_match_points(target_match_id uuid)`: admin-only point recalculation.

RLS is enabled on all core tables. Users can manage only their own unlocked predictions. Admins can manage matches and recalculate points.

Private group data is protected with RLS:

- users can read groups only when they are accepted members or owners;
- users can read their own invitations;
- accepted members can read the member list for their group;
- writes use Supabase RPC functions for create, join, invite, accept/decline, leave, remove, update, regenerate code, and delete;
- regular users cannot add themselves to a private group without a valid invite code or invitation.

If you already ran an older schema, rerun the latest `supabase/schema.sql`. It uses `add column if not exists` and `create table if not exists` for the new sync fields/logs and private group tables.

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

Only accepted members appear in a group leaderboard. The group leaderboard uses the same `leaderboard_profiles` totals as the public scoreboard, filtered to accepted members of that group.

## Timezone Handling

Supabase stores `matches.match_date` as `timestamptz` in UTC. Public pages display kickoff times in the visitor's local timezone with a timezone abbreviation. The Admin Match form uses the admin browser's local timezone for `datetime-local` editing and shows the UTC value that will be saved.

## Fixture Sync

There are two sync paths:

1. Scheduled server-side sync through GitHub Actions.
2. Admin manual fallback sync from the Admin Dashboard.

### Scheduled API-Football Sync

The workflow `.github/workflows/sync-fixtures.yml` runs every four hours and can also be started manually from GitHub Actions.

It runs:

```bash
npm run sync:fixtures
```

The server script reads:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FOOTBALL_API_KEY
FOOTBALL_API_HOST
FIXTURE_PROVIDER
```

Default provider:

```text
FIXTURE_PROVIDER=api-football
FOOTBALL_API_HOST=https://v3.football.api-sports.io
```

API-Football/API-SPORTS is used as the primary provider for World Cup 2026 fixtures, match times, status, and final scores. The script requests World Cup fixtures using league `1` and season `2026`.

If API-Football fails after credentials are configured, the script falls back to openfootball and records `fallback_used = true` in `sync_logs`.

The script:

- validates required server environment variables;
- never prints secrets;
- normalizes provider data into the existing `matches` table;
- matches existing rows by provider fixture id, external reference, match number, date, and team names;
- avoids overwriting useful existing values with null or empty provider values;
- inserts new matches;
- updates changed kickoff time, teams, stage, status, venue, city, score, and result;
- detects newly finished or changed-result matches;
- calls `recalculate_match_points` only for affected finished matches;
- writes a persistent `sync_logs` row.

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

In Supabase Auth settings, add:

- `http://localhost:5173/`
- `https://<github-username>.github.io/<repository-name>/`

If email confirmation is enabled, also set the production site URL to the GitHub Pages URL.

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
FOOTBALL_API_KEY
FOOTBALL_API_HOST
FIXTURE_PROVIDER
```

`VITE_GITHUB_REPOSITORY_NAME` should match the repository name so Vite builds assets with the correct base path.

Use repository **secrets** for `SUPABASE_SERVICE_ROLE_KEY` and `FOOTBALL_API_KEY`. Do not put them in React code and do not prefix them with `VITE_`.

The workflow `.github/workflows/deploy.yml` runs on pushes to `main`, builds with `npm run build`, uploads `dist`, and deploys with:

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

The scheduled fixture sync workflow is separate from deployment. It does not rebuild the site; it updates Supabase data directly with the service role key.

## Future Improvements

- Add private friend leagues.
- Add CSV export for admin scoring audits.
- Add richer match detail pages.
- Add prediction reminders before kickoff.
- Add deeper provider reconciliation for group names and knockout placeholders if provider formats change.
