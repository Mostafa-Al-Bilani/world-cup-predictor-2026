# World Cup Predictor 2026

A production-deployed World Cup prediction platform built with React, Vite, Tailwind CSS, and Supabase.

Users can predict exact match scores, choose the tournament champion, complete round-by-round knockout picks, create private groups, and compete through global or group leaderboards.

## Live Demo

[Open World Cup Predictor 2026](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

> Independent fan project. Not affiliated with FIFA. No official FIFA logos, mascots, protected graphics, or branding are used.

## Core Features

- Exact-score predictions with automatic winner or draw selection
- Kickoff-based prediction locking
- Group-stage draw support and knockout winner validation
- Tournament champion prediction
- Round-by-round knockout advancement predictions
- Global and private-group leaderboards
- Private groups, invite codes, user invitations, and member management
- Shared group predictions for the next live or upcoming match
- Live score refresh and goal or match-phase notifications
- Admin fixture, score, synchronization, and scoring controls
- Supabase Row Level Security and protected RPC functions
- Automated tests and GitHub Pages deployment

## Engineering Highlights

- Enforced prediction rules in both the React client and PostgreSQL
- Designed idempotent scoring for matches, champion picks, and bracket stages
- Protected private user and group data with Row Level Security
- Separated public leaderboard data from private profile fields
- Reconciled third-party fixtures using provider IDs, aliases, kickoff times, placeholders, and duplicate detection
- Implemented scheduled synchronization through GitHub Actions and a Supabase Edge Function
- Preserved trusted scoring fields by restricting browser writes
- Added production configuration checks and development-only local demo mode

## Screenshots

Add portfolio screenshots to `docs/images/` using these filenames:

```text
docs/images/matches.png
docs/images/bracket.png
docs/images/scoreboard.png
```

Then uncomment this section:

<!--
<p align="center">
  <img src="docs/images/matches.png" alt="Match prediction interface" width="31%" />
  <img src="docs/images/bracket.png" alt="Bracket prediction interface" width="31%" />
  <img src="docs/images/scoreboard.png" alt="Leaderboard interface" width="31%" />
</p>
-->

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

The browser reads application data from Supabase. Provider synchronization runs through trusted server-side paths rather than exposing privileged credentials in the frontend.

See [Architecture](docs/architecture.md) for details.

## Prediction Rules

### Match predictions

Users enter both score values. The result is derived automatically:

- Team A score greater than Team B selects Team A
- Team B score greater than Team A selects Team B
- Equal group-stage scores select Draw
- Equal knockout-stage scores are rejected

Predictions lock when:

- kickoff time is reached;
- match status is no longer `upcoming`;
- either team is still a placeholder.

### Match scoring

| Outcome | Points |
| --- | ---: |
| Correct result | 1 |
| Exact score bonus | 1 |
| Maximum per match | 2 |
| Incorrect result | 0 |

The exact-score bonus is awarded only when the predicted result and both score values match the stored final result.

### Champion scoring

| Prediction | Points |
| --- | ---: |
| Correct tournament champion | 3 |

### Bracket scoring

| Stage | Required teams | Points per correct team | Maximum |
| --- | ---: | ---: | ---: |
| Round of 32 | 32 | 1 | 32 |
| Round of 16 | 16 | 2 | 32 |
| Quarter-finals | 8 | 3 | 24 |
| Semi-finals | 4 | 4 | 16 |
| Finalists | 2 | 5 | 10 |

The Round of 32 has a fixed configured deadline. Later stages open after the previous stage's full real-team pool is known and normally close 24 hours later, capped by the first kickoff if it occurs sooner.

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

macOS or Linux:

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

Run the complete schema:

```text
supabase/schema.sql
```

Optionally load the repository's 104-match schedule:

```text
supabase/seed.sql
```

Promote an account to admin:

```sql
update public.profiles
set is_admin = true
where email = 'your-email@example.com';
```

See [Supabase Setup](docs/supabase-setup.md) for the complete setup process.

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

The automated test suites cover:

- match scoring and prediction states;
- champion and bracket scoring;
- bracket validation and stage locks;
- live goal and match-phase detection;
- date conversion and kickoff locking;
- fixture normalization and duplicate reconciliation;
- private-group access helpers;
- invitations;
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
- GitHub Actions schedules are not guaranteed to execute at exact times.
- Browser live updates use polling rather than WebSockets.
- openfootball is a community fallback and is not guaranteed to provide real-time official data.
- The project currently deploys the frontend to GitHub Pages; the Edge Function is deployed separately.

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

## Project Status

The core product is implemented and deployed. Current work focuses on production hardening, live-data reliability, automated testing, and tournament-time operational readiness.

## Author

Built by [Mostafa Al Bilani](https://github.com/Mostafa-Al-Bilani).
