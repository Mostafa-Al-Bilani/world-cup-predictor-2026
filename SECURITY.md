# Security

This app is a GitHub Pages frontend that talks directly to Supabase. The Supabase project URL and anon/publishable key are public by design. They are not secrets. Security depends on Supabase Auth, Row Level Security, least-privilege policies, and keeping server-only credentials out of the frontend build.

## Public Frontend Variables

These values can be present in GitHub Pages builds:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GITHUB_REPOSITORY_NAME`

The anon key only identifies the public client. It must be paired with strict RLS policies.

## Values That Must Never Be Committed

Never commit these values to source code, docs, examples, screenshots, logs, or frontend environment variables:

- Supabase service role key
- Supabase database password
- Supabase JWT secret
- Supabase refresh tokens or access tokens
- GitHub personal access tokens
- API-Football keys
- Any `.env`, `.env.local`, or `.env.production` file with real values

Server-only fixture sync secrets belong in GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_API_KEY`

## Required Supabase RLS Model

Run the current `supabase/schema.sql` in the Supabase SQL editor after pulling security updates.

Expected access:

- `matches`: public read, admin-only writes.
- `predictions`: authenticated users can read/write only their own rows; admins can manage for scoring.
- `profiles`: users can read/update their own safe profile fields; admins can manage profiles.
- `leaderboard_profiles`: public read of safe leaderboard fields only.
- `sync_logs`: admin read/insert from the browser; service role writes from GitHub Actions.
- `groups`: accepted members and owners can read; RPC-only writes.
- `group_members`: members can read memberships for their groups; RPC-only membership changes.
- `group_invitations`: invitees and group managers can read/update appropriate invitations.

The app UI hides protected actions, but RLS is the enforcement layer.

## Credential Rotation

If a private key or token leaks:

1. Revoke or rotate it immediately in Supabase or the provider dashboard.
2. Update GitHub repository secrets with the new value.
3. Remove the exposed value from local files and commit history if it was committed.
4. Re-run the GitHub Pages deployment.
5. In Supabase Auth, revoke affected user sessions if access tokens were exposed.

If only the Supabase URL or anon key appears in browser requests, that is expected for this architecture. Review RLS rather than rotating those values by default.

## Production Security Checks

Before publishing changes:

1. Run `npm run lint`.
2. Run `npm run build`.
3. Run `npm audit`.
4. Search for risky patterns:
   - `dangerouslySetInnerHTML`
   - `eval(`
   - `new Function`
   - `access_token`
   - `refresh_token`
   - `service_role`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `console.log`
5. Confirm GitHub Pages uses real Supabase environment values.
6. Confirm production does not enter local demo mode.
7. Confirm protected Supabase actions fail when tried as another user.

## Supabase Auth Redirects

For GitHub Pages, configure Supabase Auth URLs with the deployed site:

- Site URL: `https://mostafa-al-bilani.github.io/world-cup-predictor-2026/`
- Additional redirect URL: `https://mostafa-al-bilani.github.io/world-cup-predictor-2026/`

The app uses `HashRouter` and handles password recovery after Supabase restores the recovery session.

## Manual Dashboard Actions

In Supabase:

1. Run the latest `supabase/schema.sql`.
2. Confirm RLS is enabled for every public table.
3. Confirm no broad public write policies exist.
4. Confirm Storage buckets are private unless intentionally public.
5. Confirm only intended users have `profiles.is_admin = true`.

In GitHub:

1. Keep frontend variables in repository variables or secrets.
2. Keep service-role and API keys only in repository secrets.
3. Do not expose service-role secrets in GitHub Pages build env.
