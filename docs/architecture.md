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

- authentication and recovery screens;
- route protection and the champion-pick gate;
- fixture display, search, and filtering;
- exact-score prediction forms;
- score-driven result derivation;
- champion and bracket selection;
- global and group leaderboards;
- private-group administration;
- admin fixture management;
- consolidated browser polling for updated Supabase match data;
- live match-phase and goal-event presentation;
- loading, empty, error, locked, and busy states;
- accessible navigation, filters, search controls, and dialogs;
- user-facing validation and safe error messages.

The frontend is not trusted for scoring or privileged operations.

## Shared match availability model

`src/utils/matches.js` is the shared source for:

- placeholder-team recognition;
- determining whether both teams are confirmed;
- determining whether a match is open for prediction;
- calculating the missing-prediction count.

A fixture is open only when:

1. both teams are real;
2. normalized status is `upcoming`;
3. kickoff is in the future.

Recognized placeholders include:

- empty values;
- `TBD` and `To be determined`;
- group-position labels;
- winner or loser labels;
- runner-up and place labels;
- compact slots such as `1A`, `2B`, `W12`, and `L34`.

The navbar, dashboard, and match-card behavior use this shared definition so counts and actions remain consistent.

## Client-side update events

After a prediction is saved, `predictionService` dispatches:

```text
world-cup-predictor:predictions-updated
```

The navigation listens for this event and recalculates the missing-prediction badge immediately.

Live match polling publishes match updates through the shared matches-updated event. This avoids separate pages creating redundant notification polling loops.

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
Frontend validates score pair and stage rules
              |
              v
Shared availability logic confirms:
- real teams
- upcoming status
- future kickoff
              |
              v
Prediction upsert to Supabase
              |
              v
Database triggers validate:
- match exists
- prediction ownership
- real teams are known
- match is upcoming
- kickoff has not passed
- both scores exist
- score and result agree
- draw is valid for stage
              |
              v
Client emits predictions-updated event
              |
              v
Navbar/dashboard counts refresh
```

The displayed result controls are derived, read-only indicators rather than separate manual choices.

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

Scoring functions overwrite trusted totals rather than incrementing repeatedly.

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

This permits public rankings without exposing private email or admin fields.

Search results are filtered separately from the stable full-board rank and summary totals so typing in the search field does not change the user's real global rank.

## Live-event data flow

```text
ESPN scoreboard event
        |
        +--> status / phase / elapsed minute
        +--> listed score and result
        +--> competition details
        +--> scoring plays
                    |
                    v
sync-live-matches Edge Function
                    |
                    v
matches.goal_events JSONB
                    |
                    v
MatchCard live goal timeline
```

A stored goal event can contain:

- `side`;
- `minute`;
- `clock`;
- `player`;
- `own_goal`;
- `penalty`.

Shootout kicks are not treated as ordinary goal events.

The React display exposes goal events only during a live phase and normalizes labels for live, half time, extra time, and penalties.

## Synchronization architecture

### Edge Function path

```text
Scheduler or manual call
        |
        v
Find candidate matches:
- four hours behind now
- twenty-four hours ahead
        |
        v
Apply per-match due interval
        |
        v
Build one ESPN date range
padded by one day on each side
        |
        v
Fetch and deduplicate scoreboard events
        |
        v
Match by provider fixture ID
or team names + kickoff tolerance
        |
        v
Update matches, goal_events, and sync_logs
```

Current due logic uses approximately:

- 45 seconds between sync attempts for live matches;
- 3 minutes near kickoff;
- 30 minutes for fixtures later within the next day.

This logic limits unnecessary provider calls while keeping live data reasonably fresh.

The padded ESPN query is necessary because ESPN groups scoreboard events by US-local date rather than strict UTC date.

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

## Resilient UI behavior

Recent hardening includes:

- retrying registration team-list loading;
- guarded duplicate sign-out attempts;
- guarded duplicate admin recalculation requests;
- confirmation-dialog Escape, backdrop, focus, and busy handling;
- clearing stale group state after load failures;
- explicit dashboard loading and error states;
- stopping deep-link scroll retries when their target cannot exist;
- immediate match-card lock changes at kickoff;
- normalized admin status filtering;
- accessible labels for search and dropdown controls.

## Deployment boundaries

- The React frontend deploys to GitHub Pages.
- The Supabase Edge Function deploys separately.
- Supabase schema changes deploy through SQL execution.
- GitHub Actions fixture synchronization runs independently from frontend deployment.
