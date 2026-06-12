# Installation Guide

Copy the contents of `world-cup-predictor-docs/` into the repository root.

## Replace

```text
README.md
```

Replace the current root README with the new recruiter-facing version.

## Add

```text
docs/README.md
docs/architecture.md
docs/local-development.md
docs/supabase-setup.md
docs/authentication.md
docs/deployment.md
docs/fixture-sync.md
docs/database-reference.md
docs/troubleshooting.md
docs/images/README.md
```

## Keep unchanged

```text
SECURITY.md
docs/security-checklist.md
```

Do not delete or overwrite the existing security files.

## Final repository structure

```text
world-cup-predictor-2026/
├── README.md
├── SECURITY.md
├── docs/
│   ├── README.md
│   ├── architecture.md
│   ├── authentication.md
│   ├── database-reference.md
│   ├── deployment.md
│   ├── fixture-sync.md
│   ├── local-development.md
│   ├── security-checklist.md
│   ├── supabase-setup.md
│   ├── troubleshooting.md
│   └── images/
│       ├── README.md
│       ├── matches.png
│       ├── bracket.png
│       └── scoreboard.png
└── ...
```

The PNG files are optional initially. Add them when screenshots are ready.

## PowerShell copy method

From the extracted package directory:

```powershell
Copy-Item .\README.md <repo-path>\README.md -Force
Copy-Item .\docs\* <repo-path>\docs\ -Recurse -Force
```

Review changes:

```powershell
cd <repo-path>
git status
git diff -- README.md docs
```

Validate:

```powershell
npm run test
npm run build
npm run lint
```

Commit:

```powershell
git add README.md docs
git commit -m "Restructure project documentation"
git push
```
