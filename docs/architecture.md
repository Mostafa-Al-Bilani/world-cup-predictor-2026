# Architecture

## Overview

World Cup Predictor 2026 is a React single-page application backed by Supabase.

```text
Browser
  |
  | HTTPS
  v
React + Vite + HashRouter
  |
  +--> Supabase Auth
  |
  +--> Supabase Postgres
  |      - Row Level Security
  |      - RPC functions
  |      - triggers
  |      - public-safe views/tables
  |
  +--> Public flag assets

Trusted synchronization paths
  |
  +--> Supabase Edge Function --> ESPN
  |
  +--> GitHub Actions --> Node sync script --> ESPN/openfootball
  |
  +--> Admin browser session --> openfootball fallback
```

## Frontend responsibilities

The React application handles:

- authentication screens;
- route protection;
- fixture display and filtering;
- match prediction forms;
- score-driven result selection;
- champion and bracket selection;
- global and group leaderboards;
- private-group administration;
- admin fixture management;
- browser polling for updated Supabase data;
- user-facing validation and error messages.

The frontend is not trusted for scoring or privileged operations.

## Database responsibilities

Supabase Postgres handles:

- profiles;
- matches;
- match predictions;
- champion predictions;
- bracket predictions;
- bracket windows;
- groups, memberships, and invitations;
- synchronization logs;
- trusted score calculations;
- public-safe leaderboard data;
- Row Level Security;
- validation triggers;
- permission boundaries.

## Trust boundaries

### Public browser

The browser uses the Supabase anonymous key.

The anonymous key is public by design. Security depends on:

- Row Level Security;
- table grants;
- function grants;
- secure RPC definitions;
- trusted service-role operations.

### Authenticated browser

Authenticated users can:

- read permitted private data;
- save their own unlocked predictions;
- call explicitly granted group, champion, and bracket RPC functions.

They cannot directly write trusted score totals.

### Service role

The service role is used only by trusted server-side synchronization paths.

It can:

- update fixtures;
- record synchronization logs;
- recalculate points;
- refresh bracket scoring.

The service-role key must never appear in frontend code or a `VITE_` variable.

## Prediction flow

```text
User enters Team A and Team B scores
              |
              v
Frontend derives team_a / draw / team_b
              |
              v
Frontend validates draw and lock rules
              |
              v
Prediction upsert to Supabase
              |
              v
Database triggers validate:
- match exists
- real teams are known
- match is upcoming
- kickoff has not passed
- both scores exist
- score and result agree
- draw is valid for stage
```

## Scoring flow

```text
Provider/admin marks match finished
              |
              v
recalculate_match_points(match_id)
              |
              +--> winner points
              +--> exact-score points
              +--> profile totals
              +--> champion recalculation
              +--> bracket recalculation
```

Scoring functions are designed to overwrite trusted totals rather than increment them repeatedly.

## Public leaderboard design

Private profile data and public ranking data are separated.

```text
profiles
  |
  | trigger
  v
public_leaderboard_profiles
  |
  v
leaderboard_profiles view
```

This allows public rankings without exposing private profile email or admin fields.

## Synchronization architecture

### Edge Function path

```text
Supabase scheduler or manual call
              |
              v
sync-live-matches Edge Function
              |
              v
ESPN scoreboard
              |
              v
Supabase matches + sync_logs
```

### GitHub Actions path

```text
GitHub cron/manual dispatch
              |
              v
scripts/sync-fixtures.js
              |
              +--> ESPN
              +--> openfootball
              |
              v
Supabase matches + sync_logs
```

### Admin fallback path

```text
Authenticated admin
              |
              v
fixtureSyncService
              |
              v
openfootball
              |
              v
Supabase
```

## Deployment boundaries

- The React frontend deploys to GitHub Pages.
- The Supabase Edge Function deploys separately.
- Supabase schema changes deploy through SQL execution.
- GitHub Actions fixture synchronization runs independently from frontend deployment.
