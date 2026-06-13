# World Cup Predictor 2026

A production-deployed World Cup prediction platform built with React, Vite, Tailwind CSS, and Supabase.

Users can predict exact match scores, choose the tournament champion, complete round-by-round knockout advancement picks, create private groups, and compete through global or group leaderboards.

## Live Demo

[Open World Cup Predictor 2026](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

> Independent fan project. Not affiliated with FIFA. No official FIFA logos, mascots, protected graphics, or branding are used.

## Core Features

- Exact-score predictions with automatic winner or draw derivation
- Kickoff-based prediction locking without waiting for the next polling cycle
- Shared placeholder-team detection across the navbar, dashboard, and match cards
- Missing-prediction badge that counts only open fixtures with two confirmed teams
- Immediate missing-prediction count refresh after a prediction is saved
- Group-stage draw support and knockout winner validation
- Tournament champion prediction with locked selection and separate scoring
- Round-by-round knockout advancement predictions
- Public and private-group leaderboards
- Private groups, invite codes, invitations, member management, and group prediction views
- Live-score refresh with normalized match-phase labels
- Synced live goal events with scorer, minute, own-goal, and penalty indicators
- Loading, empty, and error states for data-heavy screens
- Accessible filters, search inputs, confirmation dialogs, and responsive navigation
- Admin fixture, score, synchronization, and scoring controls
- Supabase Row Level Security and protected RPC functions
- Automated tests and GitHub Pages deployment

## Recent Reliability Improvements

The current application includes the following production-hardening changes:

- unified match availability and placeholder detection;
- consistent missing-prediction counts between navigation and dashboard;
- event-driven badge refresh after prediction saves;
- immediate lock-state changes at kickoff;
- guarded prediction submissions and admin recalculation actions;
- stable scoreboard totals and rank while searching;
- resilient dashboard and group loading behavior;
- registration retry when the team list cannot be loaded;
- password validation aligned with the configured Supabase policy;
- keyboard, backdrop, focus, and busy handling for confirmation dialogs;
- guarded sign-out behavior;
- consolidated live-update polling;
- ESPN date-range padding to avoid near-midnight timezone misses;
- goal-event synchronization and display on live match cards.

## Engineering Highlights

- Enforced prediction rules in both the React client and PostgreSQL
- Designed idempotent scoring for matches, champion picks, and bracket stages
- Protected private user and group data with Row Level Security
- Separated public leaderboard data from private profile fields
- Reconciled fixtures using provider IDs, aliases, kickoff times, placeholders, and duplicate detection
- Implemented trusted synchronization through GitHub Actions and a Supabase Edge Function
- Preserved trusted scoring fields by restricting browser writes
- Added production configuration checks and development-only local demo mode
- Added shared utilities and tests for match availability, live display, scoring, validation, and reconciliation

## Screenshots

Repository screenshots use these filenames:

```text
docs/images/dashboard.png
docs/images/live-match.png
docs/images/matches.png
docs/images/prediction-states.png
docs/images/scoreboard.png
docs/images/my-predictions.png
docs/images/bracket.png
docs/images/admin-dashboard.png
```

Suggested README gallery:

<p align="center">
  <img src="docs/images/dashboard.png" alt="Authenticated dashboard" width="48%" />
  <img src="docs/images/live-match.png" alt="Live match and locked prediction" width="48%" />
</p>

<p align="center">
  <img src="docs/images/matches.png" alt="Match prediction interface" width="48%" />
  <img src="docs/images/scoreboard.png" alt="Global leaderboard" width="48%" />
</p>

<p align="center">
  <img src="docs/images/my-predictions.png" alt="Prediction history and totals" width="48%" />
  <img src="docs/images/bracket.png" alt="Bracket prediction interface" width="48%" />
</p>

<p align="center">
  <img src="docs/images/prediction-states.png" alt="Predicted and unpredicted match states" width="48%" />
  <img src="docs/images/admin-dashboard.png" alt="Administrative operations dashboard" width="48%" />
</p>

If an image has not been committed yet, either add it under `docs/images/` or temporarily remove its `<img>` tag to avoid a broken README image.

## Architecture

```text
React 19 + Vite + Tailwind CSS
              |
              v
       Supabase Auth
              |
              v
Supabase Postgres + RLS + RPC + Triggers
              |
       +------+------+
       |             |
       v             v
Edge Function    GitHub Actions
       |             |
       +------+------+
              |
              v
      ESPN / openfootball
```

The browser reads application data from Supabase. Privileged provider synchronization and trusted scoring run through server-side paths rather than exposing service-role credentials in the frontend.

See [Architecture](docs/architecture.md).

## Prediction Rules

### Match availability

A fixture is open for prediction only when:

- both teams are confirmed and are not placeholder labels;
- the normalized match status is `upcoming`;
- the kickoff timestamp is still in the future.

Placeholder recognition covers labels such as `TBD`, group-position labels, winner/loser labels, and compact slots such as `1A`, `2B`, `W12`, and `L34`.

### Score entry

Users enter both score values. The result is derived automatically:

- Team A score greater than Team B selects Team A
- Team B score greater than Team A selects Team B
- Equal group-stage scores select Draw
- Equal knockout-stage scores are rejected

The derived result controls are read-only indicators.

### Match scoring

| Outcome | Points |
| --- | ---: |
| Correct result | 1 |
| Exact score bonus | 1 |
| Maximum per match | 2 |
| Incorrect result | 0 |

The exact-score bonus is awarded only when the predicted result and both predicted scores match the stored final result.

### Champion scoring

| Prediction | Points |
| --- | ---: |
| Correct tournament champion | 3 |

The champion result is shown only after the tournament final is finished.

### Bracket scoring

| Stage | Required teams | Points per correct team | Maximum |
| --- | ---: | ---: | ---: |
| Round of 32 | 32 | 1 | 32 |
| Round of 16 | 16 | 2 | 32 |
| Quarter-finals | 8 | 3 | 24 |
| Semi-finals | 4 | 4 | 16 |
| Finalists | 2 | 5 | 10 |

The Round of 32 uses its configured deadline. Later stages open when the previous stage's complete real-team pool is known and close according to the configured window, capped by the first kickoff when necessary.

## Tech Stack

### Frontend

- React 19
- React Router 7 with `HashRouter`
- Vite 6
- Tailwind CSS 3
- Lucide React
- React Hot Toast
- Flag Icons
- clsx

### Backend

- Supabase Auth
- Supabase Postgres
- Row Level Security
- PostgreSQL triggers and RPC functions
- Supabase Edge Functions

### Automation and quality

- GitHub Actions
- GitHub Pages
- Node.js fixture synchronization
- Node.js built-in test runner
- ESLint

## Main Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `#/` | Public | Landing page or authenticated dashboard |
| `#/matches` | Public | Fixtures and predictions |
| `#/scoreboard` | Public | Global and group scoreboards |
| `#/login` | Public | Login |
| `#/register` | Public | Registration and champion selection |
| `#/forgot-password` | Public | Request password reset |
| `#/reset-password` | Recovery session | Set a new password |
| `#/champion-pick` | Authenticated | Lock champion prediction |
| `#/my-predictions` | Authenticated | Review saved and scored predictions |
| `#/bracket` | Authenticated | Submit knockout advancement picks |
| `#/groups` | Authenticated | Create, join, and manage groups |
| `#/groups/:groupId` | Group member | Group details, members, and leaderboard |
| `#/admin` | Admin | Match, synchronization, and scoring management |

## Quick Start

### Requirements

- Node.js
- npm
- Supabase project for full functionality

The GitHub Actions workflows currently use Node.js 24.

### Install

```bash
git clone https://github.com/Mostafa-Al-Bilani/world-cup-predictor-2026.git
cd world-cup-predictor-2026
npm install
```

Create `.env`:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

Start development:

```bash
npm run dev
```

### Validation commands

```bash
npm run test
npm run build
npm run lint
```

## Supabase Setup

Run:

```text
supabase/schema.sql
```

Optionally load the 104-match schedule:

```text
supabase/seed.sql
```

Promote an account to admin:

```sql
update public.profiles
set is_admin = true
where email = 'your-email@example.com';
```

See [Supabase Setup](docs/supabase-setup.md).

## Fixture Synchronization

The project supports:

- Supabase Edge Function synchronization from ESPN
- Scheduled GitHub Actions synchronization
- Manual Node.js synchronization
- Admin openfootball fallback synchronization

Server-side synchronization requires:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
FIXTURE_PROVIDER=espn
```

Never expose the service-role key through a `VITE_` variable.

See [Fixture Synchronization](docs/fixture-sync.md).

## Testing

The automated suites cover:

- match scoring and prediction states;
- champion and bracket scoring;
- bracket validation and stage locks;
- placeholder detection and open-fixture counting;
- live goal-event and match-phase display;
- date conversion and kickoff locking;
- fixture normalization and duplicate reconciliation;
- private-group access helpers and invitations;
- leaderboard normalization;
- input validation and safe errors.

Run:

```bash
npm run test
```

## Security

Security controls include:

- Row Level Security on core data;
- protected private groups and invitations;
- public-safe leaderboard and synchronization views;
- trusted server-side scoring;
- service-role-only administrative operations;
- database validation for prediction locks and score consistency;
- production failure when Supabase configuration is missing.

Review:

- [Security Policy](SECURITY.md)
- [Security Checklist](docs/security-checklist.md)

## Current Limitations

- ESPN is an unofficial public data source and may delay or omit fixtures.
- ESPN groups events by US-local scoreboard dates, so synchronization uses a padded range to reduce timezone misses.
- GitHub Actions schedules are not guaranteed to execute at exact times.
- Browser live updates use polling rather than WebSockets.
- openfootball is a community fallback and is not guaranteed to provide real-time official data.
- The frontend deploys to GitHub Pages; the Edge Function is deployed separately.

## Documentation

- [Documentation Index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Local Development](docs/local-development.md)
- [Supabase Setup](docs/supabase-setup.md)
- [Authentication](docs/authentication.md)
- [Deployment](docs/deployment.md)
- [Fixture Synchronization](docs/fixture-sync.md)
- [Database Reference](docs/database-reference.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Security Checklist](docs/security-checklist.md)
- [Google Stitch Product Specification](STITCH_PRODUCT_SPEC.md)

## Project Status

The core product is implemented and deployed. Current work focuses on visual refinement, production hardening, live-data reliability, automated testing, and tournament-time operational readiness.

## Author

Built by [Mostafa Al Bilani](https://github.com/Mostafa-Al-Bilani).
