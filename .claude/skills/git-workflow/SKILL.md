# Git Workflow

Manages the branching and PR workflow for this project.

## Branches

- `production` — deploys to Vercel production (prod Supabase)
- `master` — deploys to Vercel preview (dev Supabase)
- `feature/*`, `bugfix/*` — short-lived branches off `master`

## Operations

### 1. New feature branch

```
git fetch origin
git checkout -b feature/<name> origin/master
```

### 2. New bugfix branch

```
git fetch origin
git checkout -b bugfix/<name> origin/master
```

### 3. Feature/bugfix PR → master

Push the current branch and open a PR targeting `master`:

```
git push -u origin HEAD
gh pr create --base master --title "<title>" --body "$(cat <<'EOF'
## Summary
<bullets>

## Test plan
- [ ] Verified in Vercel preview (dev Supabase)
- [ ] No console errors
- [ ] Migrations applied to dev project (if any)

Commits:
$(git log --oneline origin/master..HEAD)
EOF
)"
```

### 4. Release PR — master → production

Before creating the PR, check for new migrations:

```
git diff --name-only origin/production..origin/master -- supabase/migrations/
```

If new migration files are listed, **stop and prompt the user**:

> New Supabase migrations detected that haven't been applied to production yet:
>
> <list the files>
>
> Before merging this release, you need to run these against prod Supabase:
> ```
> npx supabase db push --project-ref <PROD_PROJECT_REF>
> ```
> Run this now and confirm before I create the PR.

Wait for the user to confirm migrations are applied before proceeding.

Then open the PR:

```
git fetch origin
gh pr create --base production --head master --title "Release: <summary>" --body "$(cat <<'EOF'
## Release summary
<what changed since last release>

## Pre-merge checklist
- [ ] Preview deployment tested on dev Supabase
- [x] Migrations applied to prod Supabase
- [ ] No breaking env var changes needed

Commits:
$(git log --oneline origin/production..origin/master)
EOF
)"
```

## Rules

- Never push directly to `production`. Always go through a release PR.
- Feature/bugfix branches branch from `master` and PR back to `master`.
- New migrations must be applied to both dev and prod Supabase projects.
