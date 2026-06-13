# Fixture Synchronization

## Overview

The repository supports multiple synchronization paths:

1. Supabase Edge Function using ESPN
2. GitHub Actions using the Node.js sync script
3. Manual Node.js synchronization
4. Admin openfootball fallback synchronization
5. Optional Supabase cron calls to the Edge Function

## Providers

Current providers:

```text
espn
openfootball
```

ESPN is the default no-key live-data source. openfootball is a fixture-oriented fallback and is not guaranteed to provide real-time results.

## Supabase Edge Function

Source:

```text
supabase/functions/sync-live-matches/index.ts
supabase/functions/deno.json
```

The function:

- uses ESPN's public World Cup scoreboard feed;
- selects candidate matches from four hours before now through twenty-four hours after now;
- skips finished, cancelled, and postponed fixtures;
- decides whether each candidate is due based on status, kickoff proximity, and `last_synced_at`;
- requests ESPN events through one padded date range;
- deduplicates returned events;
- reconciles stored matches with provider events;
- updates status, scores, result, elapsed time, status detail, venue, city, provider metadata, and sync time;
- extracts scoring plays into `matches.goal_events`;
- recalculates finished-match points;
- refreshes bracket scoring;
- writes a synchronization log.

### Current due intervals

Approximate minimum time since the previous sync:

| Match state | Minimum interval |
| --- | ---: |
| Live phase | 45 seconds |
| From 120 minutes before kickoff through 30 minutes after | 3 minutes |
| Later within the next 24 hours | 30 minutes |

These checks prevent repeated provider calls when a fixture is not yet close to kickoff.

## ESPN date-range behavior

ESPN groups scoreboard events by US-local date, not strictly by UTC date.

An exact UTC date query can therefore miss a fixture shortly after UTC midnight.

The Edge Function:

1. finds the earliest and latest due kickoff;
2. pads the range by one day on each side;
3. sends one `dates=YYYYMMDD-YYYYMMDD` request;
4. sets `limit=200`;
5. deduplicates returned events.

Do not simplify this back to one exact UTC date per match.

## Event reconciliation

The Edge Function first matches by:

```text
provider_fixture_id
```

If no provider ID match exists, it compares:

- normalized Team A and Team B names;
- reversed home/away order;
- kickoff time within a four-hour tolerance.

The broader Node.js synchronization path additionally uses:

- provider name and fixture ID;
- external reference;
- match number;
- kickoff;
- stage;
- normalized team names;
- equivalent placeholder slots;
- provider aliases.

It can remove duplicate rows only when the duplicate has no predictions.

## Goal-event synchronization

ESPN scoring plays are normalized into:

```text
side
minute
clock
player
own_goal
penalty
```

Shootout attempts are excluded because they are not normal match goals and the shootout result is represented through the penalties status.

Goal events are stored in:

```text
matches.goal_events
```

The frontend displays valid goal events only while the match is in a live phase.

## Deployment

Apply the current schema before deploying the updated function:

```text
supabase/schema.sql
```

Then deploy:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set SERVICE_ROLE_KEY=your-private-service-role-key
npx supabase functions deploy sync-live-matches
```

Optional endpoint override:

```bash
npx supabase secrets set ESPN_SCOREBOARD_URL=https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard
```

## GitHub Actions workflow

Source:

```text
.github/workflows/sync-fixtures.yml
```

Schedule:

- every four hours as a baseline;
- hourly during configured tournament date windows;
- manual workflow dispatch.

Required secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

GitHub cron may be delayed and must not be treated as hard real-time scheduling.

## Node.js synchronization script

Source:

```text
scripts/sync-fixtures.js
```

Commands:

```bash
npm run sync:fixtures
npm run sync:fixtures -- --provider espn
npm run sync:fixtures -- --provider openfootball
npm run sync:fixtures -- --dry-run --provider espn
```

Environment:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
FIXTURE_PROVIDER=espn
```

## Admin fallback

The Admin Dashboard reads:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

The fallback can:

- update changed fixtures;
- insert fixtures;
- preserve trusted values when provider data is incomplete;
- recalculate finished matches;
- refresh bracket scoring;
- write a sync log.

openfootball is not guaranteed to be an official or real-time source.

Admin recalculation actions are guarded while a request is already running to prevent duplicate scoring calls.

## Optional Supabase cron

Extensions:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

Example:

```sql
select cron.schedule(
  'sync-live-matches-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-live-matches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <token>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Check cron health

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

## Check recent sync logs

```sql
select
  provider,
  status,
  started_at,
  finished_at,
  inserted_count,
  updated_count,
  unchanged_count,
  recalculated_count,
  failed_count,
  error_message
from public.sync_logs
order by started_at desc
limit 20;
```

Healthy rows normally show:

```text
status = success
failed_count = 0
error_message = null
```

A candidate that ESPN does not yet return may be counted as unchanged when kickoff is still more than 30 minutes away. A missing live or near-kickoff event is counted as a failed sync.

## Operational limitations

- ESPN may omit future fixtures.
- Provider status and scoring-play formats may change.
- ESPN date grouping requires the padded range described above.
- GitHub Actions cron may be delayed.
- Browser polling frequency does not determine provider refresh frequency.
- openfootball is a fallback, not a guaranteed live feed.
- This is near-live synchronization, not a guaranteed official real-time stream.
