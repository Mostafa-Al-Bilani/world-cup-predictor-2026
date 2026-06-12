# Fixture Synchronization

## Overview

The repository supports multiple synchronization paths:

1. Supabase Edge Function using ESPN
2. GitHub Actions using the Node.js sync script
3. Manual Node.js synchronization
4. Admin openfootball fallback synchronization
5. Optional Supabase cron calls to the Edge Function

## Providers

Current script providers:

```text
espn
openfootball
```

API-Football is not part of the current implementation.

## Supabase Edge Function

Source:

```text
supabase/functions/sync-live-matches/index.ts
supabase/functions/deno.json
```

The function:

- uses ESPN's public World Cup scoreboard feed;
- selects matches near the current time;
- skips finished, cancelled, and postponed fixtures;
- fetches events by date;
- reconciles stored matches with provider events;
- updates status, scores, result, elapsed time, status detail, venue, city, provider metadata, and sync time;
- recalculates finished-match points;
- refreshes bracket scoring;
- writes a synchronization log.

Deploy:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set SERVICE_ROLE_KEY=your-private-service-role-key
npx supabase functions deploy sync-live-matches
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

GitHub cron may be delayed and should not be treated as hard real-time scheduling.

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

## Reconciliation behavior

The sync logic can use:

- provider name and fixture ID;
- external reference;
- match number;
- kickoff time;
- stage;
- normalized team names;
- equivalent placeholder slots;
- provider aliases.

It also detects removable duplicate rows when the duplicate has no predictions.

## Admin fallback

The Admin Dashboard reads:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
```

The fallback can:

- update changed fixtures;
- insert fixtures;
- preserve existing trusted values when provider data is incomplete;
- recalculate finished matches;
- refresh bracket scoring;
- write a sync log.

openfootball is not guaranteed to be an official or real-time source.

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

## Operational limitations

- ESPN may omit future fixtures.
- Provider status formats may change.
- GitHub Actions cron may be delayed.
- Browser polling frequency does not determine provider update frequency.
- openfootball is a fallback, not a guaranteed live feed.
