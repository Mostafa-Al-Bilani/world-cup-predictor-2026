# Project Documentation

This directory contains the technical and operational documentation for World Cup Predictor 2026.

The root `README.md` is portfolio-focused. Use the files below for implementation, deployment, database, synchronization, authentication, and troubleshooting details.

## Documentation Map

| File | Purpose |
| --- | --- |
| `architecture.md` | System boundaries, data flow, shared UI state, trust model, and synchronization architecture |
| `local-development.md` | Local installation, environment variables, commands, and checks |
| `supabase-setup.md` | Database schema, seed data, Edge Function setup, admin setup, and upgrade guidance |
| `authentication.md` | Registration, password rules, confirmation, recovery, redirect URLs, and resilient UI behavior |
| `deployment.md` | GitHub Pages deployment and production checklist |
| `fixture-sync.md` | ESPN, openfootball, Edge Function, GitHub Actions, goal events, and sync diagnostics |
| `database-reference.md` | Main tables, views, RPC functions, live-event data, scoring, and RLS summary |
| `troubleshooting.md` | Common build, auth, prediction, data, deployment, and synchronization problems |
| `security-checklist.md` | Production security review checklist |

Additional root documentation:

| File | Purpose |
| --- | --- |
| `../SECURITY.md` | Security model and secret-handling policy |
| `../STITCH_PRODUCT_SPEC.md` | Current product behavior and screen requirements for Google Stitch or other design tools |

## Documentation Maintenance

Update documentation whenever a change affects:

- user-visible behavior;
- prediction availability or scoring;
- route access;
- database columns or RPC functions;
- provider synchronization;
- security or permissions;
- deployment steps;
- responsive navigation or accessibility behavior.

Do not use removed packaging instructions such as the former root `INSTALLATION_GUIDE.md`. The documentation now lives directly in the repository.
