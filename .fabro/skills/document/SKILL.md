---
name: document
description: Write clear, accurate documentation grounded in the actual code
---

# Document

Write or update documentation for the target below. Extra context from the user:

> {{user_input}}

Documentation must be **accurate** above all. Wrong docs are worse than none.
Every statement you write must be verifiable against the code as it exists now.

## Step 1 — Understand before writing

- Read the actual code, types, and public API you're documenting. Do not
  document behavior you haven't confirmed.
- Identify the audience: end user, integrating developer, or future maintainer.
  The right level of detail depends on who reads it.
- Find existing docs in the repo (`docs/`, `README`, JSDoc, inline). Match their
  structure, tone, and formatting conventions.

## Step 2 — Choose the right artifact

- **README / guide** — how to use a feature or set up the project.
- **API/reference** — exact signatures, params, return types, errors, examples.
- **JSDoc/inline** — for exported functions/types where callers benefit from
  hover docs. Keep these tight and signature-focused.
- **Architecture note** — the *why* behind a non-obvious design.

Prefer updating an existing doc over creating a new file. Only create a new file
when there's a genuine gap.

## Step 3 — Write it

Principles:

- **Lead with the point.** State what the thing does and when to use it in the
  first sentence.
- **Show, don't just tell.** Include a minimal, *correct*, runnable example.
  Copy real signatures from the code; never invent an API.
- **Be concise.** Cut filler. Respect the reader's time.
- **Document the contract:** inputs, outputs, side effects, error cases, and any
  important preconditions or gotchas.
- **Use the project's vocabulary.** Same nouns the code and product use.
- Format with proper Markdown: headings, fenced code blocks with language tags,
  tables for structured data, backticks for identifiers.

For code comments specifically:

- Explain **why**, not **what**. The code already says what.
- Do not add narration comments that restate the next line.
- Document non-obvious invariants, trade-offs, and workarounds (with the reason).

## Step 4 — Verify accuracy

- Cross-check every API name, parameter, path, and command against the code.
- Run any commands you document to confirm they work as written.
- Check that code examples typecheck / are syntactically valid.
- Ensure links resolve and file paths are correct.

## Anti-patterns

- Do not document aspirational behavior that doesn't exist yet.
- Do not copy-paste stale content from elsewhere without verifying it.
- Do not over-document trivial code; not every one-liner needs prose.
- Do not let docs drift from code — if you change behavior, update the docs in
  the same pass.

## Structure patterns by doc type

**How-to guide**

1. What you'll accomplish (one line).
2. Prerequisites.
3. Numbered steps with copy-pasteable commands/code.
4. How to verify it worked.
5. Troubleshooting for common failure points.

**API/reference entry**

- Signature (exact, copied from code).
- Parameters table: name, type, required, description.
- Return value and error cases.
- A minimal, correct example.

**Architecture note**

- The problem/context.
- The decision and the alternatives considered.
- Consequences and trade-offs.

## Writing quality checklist

- [ ] First sentence states the point.
- [ ] Every API name/param/path matches the code exactly.
- [ ] At least one correct, minimal example that you verified.
- [ ] No aspirational or stale content.
- [ ] Consistent terminology with the product and codebase.
- [ ] Proper Markdown: fenced code with language tags, tables, backticked
      identifiers, working links.
- [ ] Concise — no filler, no restating the obvious.

## Example: documenting a function

````markdown
### `resolveEntity(store, id)`

Returns the entity matching `id`, or `null` if none exists.

| Param | Type | Description |
| --- | --- | --- |
| `store` | `EntityStore` | The store to look in. |
| `id` | `string` | The entity id to resolve. |

```ts
const beat = resolveEntity(store, 'beat_123')
if (beat) render(beat)
```
````

Notice: real signature, typed params, a correct example.

## Deliverable

Report: which docs you wrote or updated, the audience, and confirmation that
every example and command was verified against the current code.
