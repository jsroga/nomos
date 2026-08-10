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

## Step 2 — Preflight gates (required when the user asked to commit)

**Before** staging for commit, run and wait for success:

```bash
npm run precommit
```

(`scripts/pre-commit.mjs` → architecture, docs, staged typecheck/eslint, **`test:unit`**, **`build`**.)

If anything fails: fix it, re-run `npm run precommit`, only then continue. Do **not** use `--no-verify`.
Husky will re-run the same script on `git commit` as a safety net.

**IMPORTANT AS FUCK — never disable rules on your own if not allowed.** Commit pressure is not
approval to `eslint-disable`, widen an `eslint.config.js` override, or add `@ts-nocheck`. Fix the
violation, or **stop and ask** — `.cursor/rules/no-gate-bypass.mdc`.

## Step 3 — Decide what belongs in the commit

- Group related changes into a single logical commit. If the diff clearly
  contains two unrelated changes, prefer two commits.
- **Do not** stage secrets or local artifacts: `.env*`, credentials, tokens,
  local databases (`*.db`, `*.db-wal`, `*.db-shm`), build output, or editor
  cruft. If such a file is modified, warn the user and leave it unstaged.
- Respect `.gitignore`; do not force-add ignored files.

## Step 4 — Write the message (Conventional Commits)

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
fix(3d-canvas): correct polygon winding for concave rooms
refactor(chat): extract context builder from stream route
```

Choose the type from the *nature* of the change: `feat` = new capability,
`fix` = bug fix, `refactor` = behavior-preserving restructure, `docs` = docs only.

### No AI attribution — ever

The message ends with the body. Do **not** append any of these:

```
Co-Authored-By: Claude <noreply@anthropic.com>
Co-authored-by: Cursor Agent <...>
🤖 Generated with Cursor / Claude Code
```

No `Co-Authored-By` trailer naming a model, agent, or IDE. No "generated with"
footer, no tool emoji, no `Assisted-by:`. A human co-author the user names is the
only trailer allowed. The commit records the change, not who typed it.

## Step 5 — Stage and commit

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

## Step 6 — Verify

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
- Never skip hooks unless the user explicitly asks (`--no-verify` is blocked by
  `.cursor/hooks/guard-commit.sh` for agent shell commits).
- When the user asks to commit: run `npm run precommit` first (build + unit tests).
- Do not create empty commits.

## Splitting into multiple commits

If the working tree mixes unrelated changes, don't force them into one commit.
Stage and commit each logical unit separately:

- A bug fix and an unrelated feature → two commits.
- Refactor + behavior change → separate them so the refactor is reviewable alone.
- Generated files (migrations, lockfiles) → keep with the change that caused them,
  not in a mystery "misc" commit.

Ask before splitting only if the boundaries are genuinely ambiguous; otherwise
use your judgment and explain the grouping in your report.

## Type selection cheatsheet

| Change | Type |
| --- | --- |
| New user-facing capability | `feat` |
| Bug fix | `fix` |
| Behavior-preserving restructure | `refactor` |
| Speed/memory improvement | `perf` |
| Tests only | `test` |
| Docs only | `docs` |
| Tooling, deps, config | `chore` / `build` / `ci` |
| Formatting, no logic change | `style` |

## Body-writing tips

- Answer "why now?" and "why this way?" — reviewers can read the diff for "what".
- Note side effects, migrations, or manual steps needed on deploy.
- Reference issues/tickets the user mentioned (`Refs #123`, `Fixes #123`).
- If the change is a one-liner with an obvious subject, a body is optional.

## Report back

State the final commit hash, the message, and the files included. If you split
into multiple commits, list each hash with its subject and grouping rationale.

