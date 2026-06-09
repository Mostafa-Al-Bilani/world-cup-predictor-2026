# World Cup Predictor 2026

FIFA World Cup 2026 prediction website where users register, predict match outcomes, earn points for correct results, and compete on a public scoreboard.

Live website: [https://mostafa-al-bilani.github.io/world-cup-predictor-2026/](https://mostafa-al-bilani.github.io/world-cup-predictor-2026/)

This is a fan project. It does not use official FIFA logos, mascots, protected graphics, or branding.

## Features

- Supabase email/password registration and login.
- Automatic profile rows after registration.
- Match browsing with search, stage filters, status filters, and responsive fixture cards.
- One prediction per user per match with duplicate prevention.
- Prediction locking after kickoff or when a match is no longer upcoming.
- Public Supabase-backed scoreboard with top-three podium, rank table, accuracy, and current-user highlight.
- My Predictions dashboard with status filters and earned points.
- Admin-only dashboard for adding, editing, deleting, finishing, and recalculating matches.
- Admin-only Sync Fixtures button using openfootball World Cup 2026 JSON data.
- GitHub Pages-safe routing through `HashRouter`.
- Official GitHub Pages deployment workflow using Pages artifacts.

## Tech Stack

- React + Vite
- Tailwind CSS
- Supabase Auth, Postgres, RPC functions, triggers, and Row Level Security
- React Router `HashRouter`
- GitHub Actions + GitHub Pages hosting

## Environment Variables

Create `.env` locally from `.env.example`:

```bash
npm install
cp .env.example .env
```

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

Local development can run without Supabase values and will use demo localStorage data. Production builds do not allow demo accounts, demo predictions, or demo scoreboard data. If Supabase variables are missing in production, the app shows a visible configuration error.

## Run Locally

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql` if you want starter fixtures before using the admin sync.
5. Register a user through the app.
6. Make that user an admin:

```sql
update public.profiles
set is_admin = true
where email = 'your-email@example.com';
```

The schema creates:

- `profiles`: user profile, admin flag, and scoreboard totals.
- `matches`: fixtures, status, scores, result, venue, and external fixture references.
- `predictions`: one prediction per user per match.
- `leaderboard_profiles`: public scoreboard view without profile emails.
- `recalculate_match_points(target_match_id uuid)`: admin-only point recalculation.

RLS is enabled on all core tables. Users can manage only their own unlocked predictions. Admins can manage matches and recalculate points.

## Fixture Sync

Admins can click **Sync Fixtures** in the Admin Dashboard.

The sync fetches:

`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`

It does not require an API key. It normalizes fixtures, matches existing rows by `external_ref`, match number, date, and team names, then:

- updates changed date, teams, stage, status, venue, city, host country, score, and result fields;
- inserts newly available fixtures;
- keeps manual admin add/edit/delete functionality.

This is a free public dataset from openfootball, not a guaranteed real-time official FIFA API.

## Supabase Auth Redirect URLs

In Supabase Auth settings, add:

- `http://localhost:5173/`
- `https://<github-username>.github.io/<repository-name>/`

If email confirmation is enabled, also set the production site URL to the GitHub Pages URL.

## GitHub Pages Deployment

This project uses GitHub Pages only. It does not use Vercel, Netlify, Render, Railway, Firebase Hosting, or the `gh-pages` package.

1. Push the repository to GitHub.
2. In GitHub, open Settings -> Pages.
3. Set Source to **GitHub Actions**.
4. Add repository secrets or variables under Settings -> Secrets and variables -> Actions:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GITHUB_REPOSITORY_NAME
```

`VITE_GITHUB_REPOSITORY_NAME` should match the repository name so Vite builds assets with the correct base path.

The workflow `.github/workflows/deploy.yml` runs on pushes to `main`, builds with `npm run build`, uploads `dist`, and deploys with:

- `actions/configure-pages`
- `actions/upload-pages-artifact`
- `actions/deploy-pages`

## Future Improvements

- Add private friend leagues.
- Add CSV export for admin scoring audits.
- Add richer match detail pages.
- Add prediction reminders before kickoff.
- Add optional official/live data provider integration if a reliable free source becomes available.
