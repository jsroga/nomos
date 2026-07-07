---
name: pr-description
description: Write a clear, reviewer-friendly pull request description from the branch changes
---

# PR Description

Write a pull request description for the current branch. Extra context from the
user:

> {{user_input}}

The audience is a reviewer who has *not* seen the code. Optimize for their time:
tell them what changed, why, and how to verify it.

## Step 1 — Gather the full picture

Run these in parallel and read the output:

- `git status` — current state.
- Determine the base branch (usually `main`), then
  `git log <base>..HEAD --oneline` — **all** commits on the branch, not just the
  last one.
- `git diff <base>...HEAD` — the complete set of changes.

Base the description on the entire branch diff, not a single commit.

## Step 2 — Understand the change

- What problem does this solve? What's the user-facing or system impact?
- What was the approach, and were there notable trade-offs or alternatives?
- What's the blast radius — which areas/files are touched?
- Any migrations, config, env vars, or manual steps required to deploy?

## Step 3 — Write the description

Use this structure (Markdown):

```markdown
## Summary

1–3 sentences: what this PR does and why. A reviewer should grasp the intent
from this alone.

## Changes

- Bullet the meaningful changes, grouped by area.
- Focus on behavior and intent, not a file-by-file dump of the diff.
- Call out anything a reviewer might find surprising.

## Why

The motivation / context. Link issues if the user provided any. Explain
non-obvious decisions and trade-offs.

## Test plan

- [ ] How you verified it (commands run, scenarios tested).
- [ ] What a reviewer should check to convince themselves it works.
- [ ] Include `npm run typecheck`, `npm run lint`, `npm run test:unit` results.

## Risk & rollout

- Migrations / config / env changes and their order.
- Backward-compatibility considerations.
- How to roll back if needed.

## Screenshots / notes

For UI changes, describe the before/after (or note where screenshots go).
Omit sections that genuinely don't apply.
```

## Step 4 — Quality pass

- **Title**: concise, imperative, ideally Conventional-Commit style
  (`feat(scope): ...`). ≤ ~70 chars.
- Keep it skimmable: short paragraphs, tight bullets, no walls of text.
- Be honest about limitations, known issues, and deferred work.
- Don't overstate: describe what the PR *does*, not what it aspires to.
- Match the repo's PR conventions if a template or prior examples exist.

## Optional: create the PR

If the user explicitly asks to open it, and the branch is pushed, use the GitHub
CLI with a HEREDOC body:

```bash
gh pr create --title "feat(scope): concise title" --body "$(cat <<'EOF'
...description...
EOF
)"
```

Do not push or open a PR unless explicitly asked. Never force-push or target a
protected branch without explicit instruction.

## Deliverable

Output the finished title and description (ready to paste), and — if you were
asked to create the PR — the resulting PR URL.
