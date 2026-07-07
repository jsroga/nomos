---
name: write-tests
description: Write meaningful vitest unit tests that pin down behavior and cover edge cases
---

# Write Tests

Write automated tests for the target below. Extra context from the user:

> {{user_input}}

If no target is given, infer it from the current diff (`git diff`) — test what
was just changed.

## Step 1 — Learn the conventions

- This project uses **vitest**; the suite runs with `npm run test:unit`.
- Find existing test files near the code under test. Match their location
  (`__tests__/*.test.ts` or colocated `*.test.ts`), imports, and structure.
- Reuse existing fixtures, factories, and mock helpers. Do not hand-roll mocks
  that the repo already provides.
- Identify the external boundaries to mock (DB, LLM providers, HTTP, Trigger.dev,
  MCP) and mock them at the same seams the codebase already uses.

## Step 2 — Read the code under test

- Read the full unit and its collaborators before writing anything.
- List the behaviors that matter: the public contract, the states, the failure
  modes. You test *those*, not private internals.

## Step 3 — Decide what to cover

For each unit, cover:

- **Happy path** — expected input → expected output.
- **Edge cases** — empty, boundary, max size, missing optional fields, unusual
  but valid data.
- **Error handling** — invalid input, rejected dependencies, and that errors
  surface the way callers/UX expect.
- **State transitions** — for stores/hooks/reducers, verify each transition
  something depends on.

Prioritize by risk: data integrity, auth, money, and destructive actions first.
Do not chase coverage of trivial code.

## Step 4 — Write the tests

Structure every test as **Arrange → Act → Assert**:

```ts
import { describe, it, expect, vi } from 'vitest'

describe('resolveEntity', () => {
  it('returns the entity when the id exists', () => {
    // Arrange
    const store = makeStore({ entities: [fixtures.beat] })
    // Act
    const result = resolveEntity(store, fixtures.beat.id)
    // Assert
    expect(result).toEqual(fixtures.beat)
  })

  it('returns null when the id is unknown', () => {
    const store = makeStore({ entities: [] })
    expect(resolveEntity(store, 'missing')).toBeNull()
  })
})
```

Rules:

- **Descriptive names** that read as specs: `it('returns 400 when body is empty')`.
- **One reason to fail** per test.
- **Deterministic**: no real time, network, ordering, or randomness. Use
  `vi.useFakeTimers()`, `vi.mock()`, and fixed seeds where needed.
- **Mock the boundary, exercise the real logic.** Don't over-mock the unit itself.
- Keep tests fast and in-memory. No real I/O.
- Test files meet the same TypeScript bar as source — no `any`, no `@ts-ignore`.

## Step 5 — Run and iterate

- Run the specific tests, then the relevant suite: `npm run test:unit`.
- If a test fails because the **code** is wrong, that's a finding — report it;
  don't weaken the test to make it pass.
- If a test fails because the **test** is wrong, fix the test.
- Never use `.skip`, `expect(true)`, or loosened assertions to force green.

## Mocking patterns (vitest)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Module boundary
vi.mock('@/lib/db', () => ({ db: { query: vi.fn() } }))

// Injected callback
const onSave = vi.fn()

// Deterministic time
beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-01-01')))
```

Mock the boundary (DB, HTTP, LLM provider), not the unit under test.

## Coverage-by-risk cheatsheet

| Area | Must cover |
| --- | --- |
| API handler | happy path, invalid body (400), auth failure |
| Store/hook | each state transition the UX depends on |
| Pure function | happy path + boundary + empty/invalid input |
| Error path | dependency rejects → error surfaces correctly |
| Destructive action | confirm/rollback behavior |

## Red flags in your own tests

- The test passes even when you break the code → it asserts nothing meaningful.
- You had to read the implementation to write the assertion → you're testing
  internals, not behavior.
- The test needs `await sleep()` or real timers → non-deterministic; fix it.
- One test asserts five unrelated things → split it.

## Deliverable

Report: the test files added/changed, what behavior each pins down, the edge
cases covered, and any bugs the tests surfaced in the code under test.
