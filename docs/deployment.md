# Deployment

## GitHub Pages frontend deployment

Workflow:

```text
.github/workflows/deploy.yml
```

The workflow runs on:

- pushes to `main`;
- manual workflow dispatch.

It:

1. checks out the repository;
2. sets up Node.js 24;
3. configures GitHub Pages;
4. installs dependencies with `npm ci`;
5. runs `npm run build`;
6. uploads `dist`;
7. deploys through the official Pages actions.

## GitHub Pages configuration

In the repository:

1. open **Settings**;
2. open **Pages**;
3. set Source to **GitHub Actions**.

## Required frontend build values

Configure as GitHub Actions secrets or variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GITHUB_REPOSITORY_NAME
```

The workflow accepts the Supabase frontend values from secrets or variables.

When `VITE_GITHUB_REPOSITORY_NAME` is missing, the workflow falls back to the current repository name.

## Vite base path

The production base path is derived from the repository name.

If the repository is renamed:

- update the GitHub variable;
- update `public/404.html`;
- confirm asset URLs after deployment.

## Edge Function deployment

The Edge Function is not deployed by the GitHub Pages workflow.

Deploy separately:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set SERVICE_ROLE_KEY=your-private-service-role-key
npx supabase functions deploy sync-live-matches
```

## Database deployment

Apply:

```text
supabase/schema.sql
```

through the Supabase SQL editor or your controlled migration process.

## Fixture workflow configuration

Workflow:

```text
.github/workflows/sync-fixtures.yml
```

Required secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

The current workflow uses ESPN.

## Production checklist

Run:

```bash
npm run test
npm run build
npm run lint
```

Verify:

- Supabase frontend variables are configured;
- no `.env` file is tracked;
- no service-role key exists in frontend code;
- the latest schema is applied;
- RLS is enabled;
- Auth redirect URLs are correct;
- the Edge Function secret exists;
- GitHub Pages deployment succeeds;
- fixture workflow secrets exist when enabled;
- synchronization logs are healthy;
- `supabase/.temp/` remains ignored.

## Rollback considerations

Frontend:

- revert the failing commit;
- push to `main`;
- let GitHub Pages redeploy.

Database:

- restore from backup or apply a corrective migration;
- do not assume frontend rollback reverses schema changes.

Edge Function:

- redeploy a known-good function revision.
