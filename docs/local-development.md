# Local Development

## Requirements

- Node.js
- npm
- Git
- Supabase project for full production-equivalent behavior

The repository workflows currently use Node.js 24.

## Clone and install

```bash
git clone https://github.com/Mostafa-Al-Bilani/world-cup-predictor-2026.git
cd world-cup-predictor-2026
npm install
```

## Environment file

Create `.env` from `.env.example`.

macOS or Linux:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Frontend variables:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_GITHUB_REPOSITORY_NAME=world-cup-predictor-2026
```

Server-side fixture script variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
FIXTURE_PROVIDER=espn
```

Never expose the service-role key through a `VITE_` variable.

## Start the development server

```bash
npm run dev
```

Default Vite address:

```text
http://localhost:5173/
```

## Demo mode

When running a non-production Vite build without valid Supabase variables, the application can use local `localStorage` demo data.

Production builds do not allow demo mode. Missing production Supabase configuration displays a configuration error page.

## npm commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run sync:fixtures
```

## Recommended pre-commit checks

```bash
npm run test
npm run build
npm run lint
```

## Fixture dry run

```bash
npm run sync:fixtures -- --dry-run --provider espn
```

or:

```bash
npm run sync:fixtures -- --dry-run --provider openfootball
```

## Local routing

The application uses `HashRouter`.

Examples:

```text
http://localhost:5173/#/matches
http://localhost:5173/#/scoreboard
http://localhost:5173/#/groups
```

## Local Supabase testing

For production-equivalent behavior:

1. create a Supabase project;
2. run `supabase/schema.sql`;
3. optionally run `supabase/seed.sql`;
4. configure Auth redirect URLs;
5. add frontend environment variables;
6. register through the application;
7. promote an account to admin when needed.
