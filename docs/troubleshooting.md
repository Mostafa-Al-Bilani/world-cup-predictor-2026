# Troubleshooting

## Build fails with a duplicate declaration

Example:

```text
The symbol "updateScore" has already been declared
```

Fix:

1. search for both declarations;
2. remove the duplicate block;
3. run:

```bash
npm run build
npm run lint
```

## Production shows a Supabase configuration error

Verify:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

are configured in GitHub Actions secrets or variables.

Production does not enable local demo mode.

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

## Registration says the team list could not be loaded

The champion picker is required for registration.

Check:

- Supabase configuration;
- team/fixture data availability;
- browser network errors;
- the champion service query;
- RLS and public read access for the required data.

Use **Retry loading teams** after the underlying problem is corrected. Do not bypass the block with a fabricated champion value.

## Password is rejected during registration or reset

Current client policy requires:

- at least 10 characters;
- one uppercase letter;
- one lowercase letter;
- one number.

Confirm Supabase Auth uses the same or a compatible password policy.

## Confirmation link does not return correctly

Check the Supabase Site URL and redirect allow list.

Include:

```text
https://<github-username>.github.io/<repository-name>/
https://<github-username>.github.io/<repository-name>/#/login
```

## Confirmation email resend appears stuck

- Wait for the current resend request to finish.
- Do not double-click the resend action.
- Check Supabase Auth email logs.
- Check the inbox and spam folder.
- Verify custom SMTP configuration if applicable.

## Password reset link opens but reset page rejects the session

- request a fresh link;
- open the latest link;
- use the same browser;
- confirm the base URL is allowed;
- verify the app receives the recovery session;
- confirm the new password meets the current policy.

## Log out is clicked twice or appears delayed

The navigation guards duplicate sign-out requests and shows `Logging out...`.

If it remains stuck:

- inspect the Supabase sign-out request;
- verify the authentication provider is reachable;
- reload only after checking whether the session was actually removed.

## Scoreboard cannot load

Check:

- `leaderboard_profiles`;
- `public_leaderboard_profiles`;
- RLS;
- public `select` grants;
- schema was fully applied.

Do not expose the private `profiles` table as a shortcut.

## Scoreboard rank changes while typing in search

The current implementation keeps global rank and summary totals based on the full leaderboard while filtering only the displayed rows.

If the rank still changes:

- confirm the latest `ScoreboardPage` is deployed;
- clear the stale GitHub Pages build;
- verify the search filter is not replacing the full leaderboard source used for summaries.

## Missing prediction badge and dashboard count disagree

Both counts must use `src/utils/matches.js`.

Verify:

- navbar uses `getMissingPredictionCount`;
- dashboard uses `isMatchOpenForPrediction`;
- match cards use `hasRealTeams`;
- old local placeholder helpers were removed;
- the prediction-updated event fires after save.

Placeholder labels such as `1A`, `2B`, `W12`, `L34`, group positions, winners, and runners-up must not count as open predictions.

## Missing prediction badge does not decrease after save

Check:

- prediction save completed successfully;
- `PREDICTIONS_UPDATED_EVENT` is dispatched;
- Navbar is listening for the event;
- the saved prediction has the correct `match_id`;
- stale JavaScript assets are not cached.

## Prediction cannot be saved

Verify:

- the user is authenticated;
- both scores are entered;
- scores are whole numbers from 0 to 99;
- the result derived from scores is valid;
- a knockout score is not tied;
- kickoff has not passed;
- status is `upcoming`;
- both teams are real;
- the prediction belongs to the current user.

Match cards update their lock state at kickoff without waiting for the next provider poll.

## Match card still shows an action for a placeholder fixture

Confirm the shared placeholder helper is used.

Recognized placeholders include:

```text
TBD
To be determined
1A
2B
W12
L34
Group A winner
Group B runner-up
1st place
2nd place
3rd place
```

## Home dashboard remains in a loading state

The dashboard has explicit loading and error states.

Check:

- match query;
- user prediction query;
- profile query;
- pending invitation query;
- browser console;
- Supabase RLS.

Retry after fixing the failed source rather than displaying stale values.

## Group detail shows data from the previous group after an error

The current page clears stale group state when loading fails.

If stale data remains:

- confirm the latest `GroupDetailPage` is deployed;
- ensure cached assets were invalidated;
- verify the route parameter changed correctly.

## Bracket stage is not open

Later rounds open only when the previous stage's complete real-team pool is known.

Check:

```sql
select *
from public.stage_prediction_windows
order by stage;
```

Also verify synced matches contain real teams rather than placeholders.

## Live match phase label looks wrong

Current normalized phases include:

```text
live
halftime
extra_time
penalties
penalty_shootout
```

Verify `status` and `status_detail` values in `matches`.

Examples:

- `HT` displays as `Half time`;
- minute details display as `<minute> min`;
- extra time falls back to `ET`;
- penalties fall back to `PEN`.

## Live goal events do not appear

Check:

- the latest schema includes `matches.goal_events`;
- the current Edge Function is deployed;
- ESPN returned scoring plays;
- `goal_events` contains valid objects;
- the match is currently in a live phase;
- the scoring play is not a shootout attempt.

Example query:

```sql
select
  id,
  team_a,
  team_b,
  status,
  goal_events,
  last_synced_at
from public.matches
where status in ('live', 'halftime', 'extra_time', 'penalties', 'penalty_shootout')
order by match_date;
```

## Edge Function does not update scores

Check:

- function deployment;
- `SERVICE_ROLE_KEY`;
- ESPN endpoint;
- candidate match time window;
- per-match due interval;
- provider fixture matching;
- function logs;
- `sync_logs`.

## ESPN sync misses a match near UTC midnight

ESPN groups scoreboard events by US-local date.

Confirm the deployed Edge Function:

- builds a date range instead of one exact UTC date;
- pads the earliest and latest due kickoffs by one day;
- sends `limit=200`;
- deduplicates returned events.

The corrected implementation prevents repeated misses for matches such as a `01:00Z` kickoff listed under the previous ESPN date.

## GitHub Actions sync fails

Check repository secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Then inspect workflow logs for:

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

Inspect:

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
