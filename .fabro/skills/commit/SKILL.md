---
name: commit
description: Create a clean, well-scoped git commit with a Conventional Commits message
---

# Commit

Create a git commit for the current changes. Extra context from the user:

> {{user_input}}

Only commit when the working tree actually has changes to commit. If there are
none, say so and stop.

## Step 1 — Understand the state

Run these in parallel and read the output before doing anything:

- `git status` — see staged, unstaged, and untracked files.
- `git diff` and `git diff --staged` — see the actual changes.
- `git log --oneline -10` — match the repository's existing message style.

Never run `git add -A` or `git commit -a` blindly. Look at what changed first.

## Step 2 — Decide what belongs in the commit

- Group related changes into a single logical commit. If the diff clearly
  contains two unrelated changes, prefer two commits.
- **Do not** stage secrets or local artifacts: `.env*`, credentials, tokens,
  local databases (`*.db`, `*.db-wal`, `*.db-shm`), build output, or editor
  cruft. If such a file is modified, warn the user and leave it unstaged.
- Respect `.gitignore`; do not force-add ignored files.

## Step 3 — Write the message (Conventional Commits)

Format:

```
<type>(<optional scope>): <subject>

<body>
```

- **type**: one of `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`,
  `build`, `ci`, `style`.
- **subject**: imperative mood, lowercase, no trailing period, ≤ 72 chars.
  "add dark-mode toggle", not "added" or "adds".
- **body** (optional but preferred for non-trivial changes): explain the *why*,
  not the *what*. Wrap at ~72 columns. Reference issues if the user mentioned any.

Good examples:

```
feat(storyteller): add episode poster variant selector
fix(interior-designer): correct polygon winding for concave rooms
refactor(chat): extract context builder from stream route
```

Choose the type from the *nature* of the change: `feat` = new capability,
`fix` = bug fix, `refactor` = behavior-preserving restructure, `docs` = docs only.

## Step 4 — Stage and commit

Stage the specific files that belong in this commit (by path), then commit using
a HEREDOC so the message formats correctly:

```bash
git add <paths>
git commit -m "$(cat <<'EOF'
feat(scope): concise subject

Why this change exists and any important context.
EOF
)"
```

## Step 5 — Verify

- Run `git status` and `git log --oneline -1` to confirm the commit landed.
- If a pre-commit hook modified files or failed:
  - If it **failed**, fix the underlying issue and create a **new** commit. Do
    not use `--no-verify` to bypass it.
  - If it **succeeded but auto-modified** files that belong in the commit, amend
    only if this commit was created just now in this session and has not been
    pushed.

## Guardrails

- Never update git config.
- Never run destructive commands (`push --force`, `reset --hard`) unless the user
  explicitly asks.
- Never push unless the user explicitly asks.
- Never skip hooks unless the user explicitly asks.
- Do not create empty commits.

Report back: the final commit hash, the message, and the files included.
