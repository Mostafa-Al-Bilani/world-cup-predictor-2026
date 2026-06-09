# Security Checklist

Use this checklist after each production deploy and after every Supabase schema change.

## Supabase Tables

- Confirm RLS is enabled on `profiles`.
- Confirm RLS is enabled on `matches`.
- Confirm RLS is enabled on `predictions`.
- Confirm RLS is enabled on `sync_logs`.
- Confirm RLS is enabled on `groups`.
- Confirm RLS is enabled on `group_members`.
- Confirm RLS is enabled on `group_invitations`.
- Confirm RLS is enabled on `world_cup_winner_predictions`.
- Confirm `matches` has public read and admin-only writes.
- Confirm `predictions` has owner-only read/write policies plus admin scoring access.
- Confirm regular users cannot update trusted prediction point fields.
- Confirm regular users cannot update profile totals, champion points, admin flags, or emails.
- Confirm champion predictions are one per user and locked after first selection.
- Confirm `profiles` does not expose emails publicly.
- Confirm `leaderboard_profiles` exposes only safe leaderboard fields.
- Confirm group tables are readable only by accepted members, invitees, or managers as intended.

## Supabase Auth

- Confirm Site URL is the GitHub Pages URL.
- Confirm password reset redirects are allowed for the GitHub Pages URL.
- Confirm email confirmation settings match the intended signup flow.
- Confirm only trusted accounts have `profiles.is_admin = true`.
- Revoke suspicious sessions after any token exposure.

## Secrets

- Confirm no service role key is present in frontend variables.
- Confirm no database password is present in frontend variables.
- Confirm no JWT secret is present in frontend variables.
- Confirm no refresh tokens or access tokens are committed.
- Confirm `.env`, `.env.local`, `.env.production`, logs, and key files are ignored.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only as a GitHub repository secret.
- Confirm `FOOTBALL_API_KEY` exists only as a GitHub repository secret.

## GitHub Pages

- Confirm the deploy workflow still uses official Pages actions.
- Confirm `npm run build` uses the correct `VITE_GITHUB_REPOSITORY_NAME`.
- Confirm production build fails visibly if Supabase frontend env vars are missing.
- Confirm demo/localStorage mode only appears on a local dev server without Supabase env vars.

## Storage

- Confirm no Supabase Storage bucket is public unless intentionally public.
- Confirm private buckets have authenticated policies.
- Confirm uploaded files, if added later, cannot be overwritten by other users.

## Browser Verification

- Log out and confirm protected pages redirect to login.
- Log in as a normal user and confirm `/admin` redirects away.
- Try to submit a prediction only before kickoff.
- Try to submit exact score values with negative or partial scores and confirm they are rejected.
- Try to update trusted point fields from browser devtools and confirm they are ignored or rejected.
- Confirm existing non-admin users without a champion pick are redirected to the champion picker after login.
- Confirm one user cannot read another user's `predictions` rows from browser devtools.
- Confirm one user cannot create or edit matches.
- Confirm private group pages are inaccessible to non-members.
- Confirm only group owners/admins can invite or remove members.
