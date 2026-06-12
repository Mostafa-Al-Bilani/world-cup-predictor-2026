# Project Documentation

This directory contains detailed technical and operational documentation for World Cup Predictor 2026.

The root `README.md` is intentionally concise and portfolio-focused. Use the files below for implementation, deployment, database, and troubleshooting details.

## Documentation Map

| File | Purpose |
| --- | --- |
| `architecture.md` | System boundaries, data flow, trust model, and major modules |
| `local-development.md` | Local installation, environment variables, commands, and checks |
| `supabase-setup.md` | Database schema, seed data, admin setup, and upgrade guidance |
| `authentication.md` | Registration, confirmation, recovery, redirect URLs, and troubleshooting |
| `deployment.md` | GitHub Pages deployment and production checklist |
| `fixture-sync.md` | ESPN, openfootball, Edge Function, GitHub Actions, and sync diagnostics |
| `database-reference.md` | Main tables, views, RPC functions, scoring, and RLS summary |
| `troubleshooting.md` | Common build, auth, data, deployment, and synchronization problems |
| `security-checklist.md` | Existing production security review checklist |

## Existing Security Policy

The repository root also contains:

```text
SECURITY.md
```

Keep `SECURITY.md` and `docs/security-checklist.md` as the security source of truth.
