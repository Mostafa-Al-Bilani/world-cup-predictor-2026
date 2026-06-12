# Troubleshooting

## Build fails with a duplicate declaration

Example:

```text
The symbol "updateScore" has already been declared
```

Cause:

- the same function or constant was added twice in one module.

Fix:

1. search for both declarations;
2. remove the duplicate block;
3. run:

```bash
npm run build
```

## Production shows a Supabase configuration error

Verify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

are configured in GitHub Actions secrets or variables.

Remember: production does not enable local demo mode.

## GitHub Pages assets return 404

Verify:

```text
VITE_GITHUB_REPOSITORY_NAME
```

matches the repository name.

Also check:

- Vite base configuration;
- `public/404.html`;
- Pages source is GitHub Actions.

## Clean auth URLs show a GitHub Pages 404

Confirm `public/404.html` exists and contains the correct repository base.

The application itself uses HashRouter routes.

## Confirmation link does not return correctly

Check Supabase Site URL and redirect allow list.

Include:

```text
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/login
```

## Password reset link opens but reset page rejects the session

- request a fresh link;
- open the latest link;
- use the same browser;
- confirm the base URL is allowed;
- verify the app receives the recovery session.

## Scoreboard cannot load

Check:

- `leaderboard_profiles`;
- `public_leaderboard_profiles`;
- RLS;
- public `select` grants;
- schema was fully applied.

Do not expose the private `profiles` table as a shortcut.

## Latest sync text is missing

Check:

- `sync_logs`;
- `public_latest_successful_sync`;
- `latest_successful_sync`;
- sync trigger;
- public select grants.

## Prediction cannot be saved

Verify:

- the user is authenticated;
- both scores are entered;
- scores are between 0 and 99;
- the result derived from scores is valid;
- knockout score is not tied;
- kickoff has not passed;
- status is `upcoming`;
- both teams are real;
- the prediction belongs to the current user.

## Group page says access is denied

Verify:

- user is the owner or an accepted member;
- membership status is `accepted`;
- RLS policies are installed;
- group owner membership exists;
- the requested group ID is valid.

## Bracket stage is not open

Later rounds open only when the previous stage's complete real-team pool is known.

Check:

```sql
select *
from public.stage_prediction_windows
order by stage;
```

Also verify synced matches contain real teams rather than placeholders.

## Edge Function does not update scores

Check:

- function deployment;
- `SERVICE_ROLE_KEY`;
- ESPN endpoint;
- candidate match time window;
- provider fixture matching;
- function logs;
- `sync_logs`.

## GitHub Actions sync fails

Check repository secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Then inspect the workflow logs for:

- install failure;
- provider failure;
- Supabase permission failure;
- schema mismatch.

## Cron job appears inactive

Run the cron health query in `docs/fixture-sync.md`.

Remember:

- `pg_cron` scheduling is minute-based;
- failed HTTP calls can still create cron run rows;
- function authentication headers must be valid.

## openfootball creates duplicates

Inspect reconciliation fields:

- provider IDs;
- external references;
- match numbers;
- kickoff;
- stage;
- normalized team aliases;
- placeholder slot matching.

Do not delete duplicate rows that already have predictions without reviewing their relationships.

## RLS permission error

Do not disable RLS immediately.

Check:

- current authentication state;
- table grants;
- function grants;
- policy conditions;
- function `search_path`;
- whether the operation should use an RPC function;
- whether the action requires admin or service role.

## `supabase/.temp/` appears in Git

Keep:

```gitignore
supabase/.temp/
```

Remove previously tracked files without deleting local files:

```bash
git rm -r --cached supabase/.temp
git commit -m "Stop tracking Supabase temp files"
```
