# Learning Materials — Backend Fundamentals, Explained Through This Repo

**Who this is for.** A developer who is comfortable writing application code but has not yet
built a mental model for database design, security boundaries, reliability, and the trade-offs
behind them — and who is about to build an agentic fiction pipeline without having been a
novelist. Backend ideas are taught through real files in this repo. Craft ideas are taught
through [wgwtest/novel-writing](https://github.com/wgwtest/novel-writing) and
`src/mastra/agents/grrm-author/`.

**How to use it.** Part 1 is the story of what was recently refactored and why. Part 2 teaches
backend fundamentals, each anchored to real code, then the agentic writing system (craft catalog,
George vibe, evaluation). Part 3 walks the thirty-two actions as a syllabus, not a ticket list.
Part 4 lists the trade-offs we have deliberately accepted. Part 5 is an honest answer to "are we
going in a good direction?"

A note on honesty: this document points at real weaknesses in code you wrote. That is not
criticism, it is the only way the material is useful. Every codebase of this size has these
issues; most teams never find them.

---

# Part 1 — What was refactored recently, by whom, and why

## The facts

All 35 commits on the `refactor` branch (`b409539`) were authored by **Jacek Sroga**, between
**23 and 28 August 2026**. They cluster into five numbered work packages. `origin/main` is 35
commits behind, so this work has not merged yet.

| Package | Commits | What it did | The problem it solved |
|---|---:|---|---|
| **SPEC-12** | 2 | One validated environment module; nothing else reads `process.env` | Configuration was read from anywhere, unvalidated. A typo in a variable name failed at 3am in production instead of at startup. |
| **SPEC-13** | 1 (+ ~8 related) | An AI gateway that records what every model call cost | You could not answer "what are we spending, and on what". LangChain was removed in the same arc. |
| **SPEC-14** | 8 | A task factory: every background job declares a schema, a queue, and a nonce | Background jobs were defined ad hoc. Some could be submitted twice; some had no ownership check. |
| **SPEC-15** | 1 | An evaluation gate that can refuse a regression | Quality was measured but nothing acted on the measurement. |
| **SPEC-16** | 1 | Contracts: parse once at the edge, piloted on 3D Asset Exporter | Data from the database and the network was reconstructed by guesswork at every read site. |

Two smaller but important fixes landed at the end: `bc06f2f` made a **missing price stop
discarding the whole usage record**, and `b409539` stopped the Writers Room refreshing sections
mid-turn.

## Why this was the right order

Look at the sequence: **configuration → cost visibility → job safety → quality gate →
data contracts**. That is not arbitrary. Each one is a *foundation* the next depends on.

You cannot meter model spend if configuration is scattered, because you do not know which key or
model was used. You cannot make jobs safe to retry until you know which ones cost money. You
cannot gate on quality until you can measure. This is a good instinct and it is worth naming:
**build the thing that makes the next thing measurable, before building the next thing.**

## The pattern to be aware of

There is one recurring shape in this work, and recognizing it is the single most valuable thing
in this document.

> **Every package built a real mechanism. Several of them do not yet enforce what their name
> promises.**

The eval gate is genuinely written and genuinely exits non-zero on a regression — but the
harness it guards scores frozen text and never calls the model. The quality ratchet has 21
counters — but 7 have no code that reads them, and any threshold can be raised in the same
commit that adds the violation. The import policy is written correctly in source — but a later
config block silently replaced it, so the cross-domain rule does not fire at all.

This is not carelessness. It is what happens when you build a mechanism and then move on
before writing the test that proves the mechanism is reachable. The lesson generalizes far
beyond this repo:

> **A guarantee you have not tried to break is a hope, not a guarantee.**

---

# Part 2 — The concepts

## 2.1 Trust boundaries and authentication

**The idea.** A trust boundary is the line where data stops being yours and starts being the
user's. Inside it, you can trust a value. Outside it, you must verify. The single most common
security bug in web applications is trusting something across that line because it *looks*
trustworthy.

**Authentication** answers "who is this?" **Authorization** answers "may they do this?" They
are different questions and beginners routinely fuse them. You can be perfectly authenticated
and still not be allowed to touch a particular row.

**In our repo.** `src/shared/auth/auth.ts` establishes identity like this:

```ts
const { data: { session } } = await supabase.auth.getSession()
```

`getSession()` reads the JWT out of the cookie and decodes it **locally**. It does not ask the
authentication server whether that token is real. `getUser()` does — it makes a network call
and revalidates. Supabase's guidance for server code is explicit: on the server, use
`getUser()`; `getSession()` is a client-side convenience.

The practical consequence: a token that is merely *shaped* like a valid session satisfies this
check. And because `requireAuth` and `withAuth` sit under **110 of our 116 API routes**, one
line decides the trust boundary for almost the entire backend.

**What good looks like.** One function establishes identity, it revalidates, and it returns a
typed object that the rest of the code can trust. Everything downstream takes that object
rather than re-deriving identity. If a value came from the client, it is *evidence*, never
*fact*, until the server has checked it.

## 2.2 Authorization and multi-tenancy

**The idea.** Multi-tenancy means many customers share one database. The whole game is making
sure tenant A can never see or touch tenant B's rows. There are three layers of defence and
you want all three:

1. **The application check** — the code asks "does this user own this project?"
2. **Row Level Security (RLS)** — the database itself refuses to return rows the user should
   not see, even if the application forgets to filter.
3. **Least privilege** — the database role the app connects as can only do what it needs.

**In our repo — the good news.** All three exist. Six migrations enable RLS across public
tables, and `20260819224600_revoke_anon_public_table_grants.sql` revokes everything from the
`anon` role so unauthenticated clients cannot even discover the tables. That is genuinely good
practice and better than most projects at this stage.

**In our repo — the catch.** RLS protects queries made *as the user*. Our server code frequently
connects as `service_role`, which **bypasses RLS entirely** — that is what the role is for. We
have 23 service-role call sites. At every one of them, RLS is not protecting you and the
application check is the only thing standing between tenant A and tenant B.

So: RLS is your seatbelt, not your brakes. It saves you when you make a mistake. It is not the
plan.

**The subtle part — ownership needs a join.** Look at the schema in
`src/db/schema-parts/core-tables.ts`:

```
projects
  └── episodes   (episode.project_id → projects.id)
        └── beats  (beat.episode_id → episodes.id)
  └── characters (character.project_id → projects.id)
```

A **beat has no `project_id`**. It only knows its episode. So "does this user own this beat?"
cannot be answered by looking at the beat. You must walk `beat → episode → project → owner`.
That is why ownership checks here are real work and easy to get subtly wrong, and it is why
the audit found routes that check *access to the existing row* but not the *shape of the
update*.

**The bug this produces.** In `src/app/api/storyteller/beats/[beatId]/route.ts`:

```ts
const body = await req.json()
await db.update(beats).set(body).where(eq(beats.id, beatId))
```

The route checks you may touch *this* beat. Then it writes whatever you sent. Send
`{"episodeId": "<someone else's episode>"}` and you have **moved the beat into another user's
episode**. The row you were allowed to edit became a row you were not allowed to create.

This class of bug — **mass assignment** — is why the rule exists:

> Never spread a request body into an update. Name the columns you allow.

Our own `episodes` route already does this correctly with an explicit allowlist that excludes
`projectId`. The pattern was there; it just was not applied everywhere.

And note the deeper principle: **changing a row's parent is not an edit, it is a move.** A move
requires authorization on *both* the source and the destination. That is a different operation
and deserves a different endpoint.

## 2.3 Database design

**Our shape.** Roughly 30 tables. The storyteller core is a clean hierarchy —
`projects → episodes → beats`, with `characters` hanging off projects. UUID primary keys with
`defaultRandom()`, `created_at`/`updated_at` on everything. This is a sound, conventional
design and there is nothing clever about it, which is a compliment.

**Indexes — mostly right, with a wrinkle.** A foreign key in Postgres is **not automatically
indexed**. This surprises nearly everyone. If `beats.episode_id` has no index, then "give me
the beats for this episode" scans the whole table, and it gets slower every day.

Checking the migrations: the indexes exist, including well-chosen composite ones:

```sql
CREATE INDEX idx_beats_episode_id  ON beats(episode_id)
CREATE INDEX idx_beats_sequence    ON beats(episode_id, sequence)
CREATE INDEX idx_episodes_sequence ON episodes(project_id, sequence)
```

**Composite column order matters, and it has a consequence people miss.** An index on
`(episode_id, sequence)` also serves queries that filter on `episode_id` alone, because
`episode_id` is the **leading column**. An index on `(sequence, episode_id)` would not. The
order chosen here is correct.

The consequence: once you have `(episode_id, sequence)`, a separate index on `(episode_id)` is
**redundant** — the composite already covers it.

**The wrinkle — a worked example worth studying.** Tracing every index on these three tables to
the migration that created it:

| Migration | Index | Column(s) |
|---|---|---|
| `20251203000000_storyteller_schema.sql` | `idx_beats_episode` | `beats(episode_id)` |
| `20260116120000_add_performance_indexes.sql` | `idx_beats_episode_id` | `beats(episode_id)` |
| `20260116120000_add_performance_indexes.sql` | `idx_beats_sequence` | `beats(episode_id, sequence)` |

Three indexes; one is enough. The same pattern repeats for `characters` and `episodes`. Two
things went wrong, and both are instructive:

1. A later "add performance indexes" migration re-created indexes that already existed **under
   different names**. `CREATE INDEX IF NOT EXISTS` protects against a duplicate *name*, not a
   duplicate *column set* — so the guard did not help.
2. That same migration added both a composite index and a single-column index on the composite's
   leading column, which is redundant by the rule above.

Every redundant index is paid for on **every insert and update**, forever, and buys nothing on
reads. Worth a cleanup migration — and worth remembering that `IF NOT EXISTS` is not a check for
"does this index already do this job."

**A real trap: the Drizzle schema has drifted from the database.** In `core-tables.ts` the
foreign keys are declared as:

```ts
projectId: uuid('project_id').references(() => projects.id).notNull(),
```

No `onDelete`. No indexes anywhere in the file — zero. But the actual database, built by raw
SQL migrations, has **33 `ON DELETE CASCADE` clauses, 91 indexes, and 58 `CHECK` constraints**.

So the TypeScript schema and the physical database disagree. This matters for two reasons.
First, anyone reading `core-tables.ts` to understand the system builds a wrong mental model —
they will think deleting a project fails, when in fact it cascades and deletes the episodes and
beats. Second, if anyone ever generates a migration *from* the Drizzle schema, it will propose
dropping the cascades and indexes that the migrations added.

The lesson: **decide which artifact is the source of truth for your schema, and make the other
one derived or verified.** Two hand-maintained descriptions of the same thing will always drift.

**`jsonb` — the trade-off you have already taken.** Look at how much of the schema is `jsonb`:
`psychology`, `arcStatus`, `storyPlan`, `tenPointsPlan`, `charactersInvolved`,
`emotionalShifts`, `causalDependencies`, `setupsPayoffs`.

`jsonb` is genuinely useful for data whose shape is still moving, which describes a creative
tool exactly. But it moves the schema from **write time to read time**. Postgres will not stop
you writing `{"foo": 1}` into `psychology`, so every single read site has to cope with
"whatever might be in there." That is precisely where the ratchet's **1148 untyped JSON reads**
come from. They are not sloppiness — they are the invoice for the `jsonb` decision.

That does not make `jsonb` wrong. It makes it a choice with a bill attached, and SPEC-16's
contracts pattern is how you pay it: parse the blob **once**, at the boundary, into a real type,
then pass the type around. That is the whole idea behind "parse, don't validate."

**Constraints belong in the database when they are invariants.** `episodes.status` is
`text` defaulting to `'planning'`. Nothing at the database level stops `'planing'`. Where a
value must be one of a fixed set forever, a `CHECK` constraint or an enum makes the database
enforce it, and the database is the one component that every path goes through. Application
code can be bypassed by a migration, a script, or a second service; the database cannot.

## 2.4 Contracts and validation at the boundary

**The idea.** "Parse, don't validate." Do not check that data is probably fine and then keep
passing the untrusted thing around. **Convert** it, once, at the edge, into a type that cannot
be wrong — then the rest of your code needs no defensive checks because the type system already
guarantees the shape.

**In our repo.** About **30 of 116 routes** validate their input with Zod. About 86 take the
body or query raw. In storyteller it is 8 validated against 34 raw. The consequence is the guard
reads above, plus 268 snake_case reads outside mappers and 42 `.passthrough()` schemas.

`.passthrough()` deserves a specific warning. It tells Zod "allow fields I did not declare."
That is legitimate when unknown fields genuinely are part of the contract. It is very often used
to make a validator stop complaining — at which point you have written something that *looks*
like validation and is not.

**The pilot to copy.** `src/domains/3d-asset-exporter/contracts/` is the reference
implementation and it is good work: a wire schema for the stored snake_case shape, a mapper as
the single translation point, a domain type in camelCase, `safeParse` for legacy stored data so
a malformed old row degrades to `null` instead of throwing a 500, and a round-trip test. Copy
this pattern; do not invent a second one.

**Where contracts drift.** Our OpenAPI document is built from a *separate registry* rather than
from the schema the route actually runs. So the published API contract and the executed contract
are different objects, and they have already diverged: the spec says
`PATCH /storyteller/characters` takes five optional fields, while the route accepts `gender`,
`characterPrompt`, `mbti`, `psychology` and several metric aliases too. Generating the document
**from** the executed schema makes that class of drift impossible rather than merely detectable.

## 2.5 Reliability and resilience — not the same thing

Beginners use these interchangeably. They are different properties and you need both.

- **Reliability** — the system does the right thing when everything works. Correct results, no
  lost writes, no double charges.
- **Resilience** — the system behaves sensibly when something *breaks*. A provider times out, a
  deploy restarts a machine mid-run, the network drops.

You can be reliable and not resilient: perfect logic that corrupts state when a pod restarts.
You can be resilient and not reliable: it never crashes, and it quietly charges twice.

**Idempotency** is the main tool. An operation is idempotent if doing it twice has the same
effect as doing it once. This matters because **in a distributed system you frequently cannot
tell the difference between "it failed" and "it succeeded but the reply was lost."** Retrying is
your only option, so retrying must be safe.

**In our repo.** SPEC-14 did this properly at one level. `defineOwnedTask` forces every task to
declare a schema, a queue, and a nonce, and `triggerOwnedRun` builds an idempotency key of
`` `${taskId}:${requestId}` ``. Submitting the same request twice runs the job once. That is
correct and well done.

But there is a level it does not reach, and this is the important lesson.

**An idempotency key protects a *submission*. It does not make a *half-finished run* safe to
retry.** `generate-tile.task.ts` runs with `maxAttempts: 3` and does three things in order:

```
1. call the image provider   ← costs real money
2. upload the result to blob storage
3. write rows to the database
```

If step 2 fails, Trigger.dev retries the task — from step 1. **You pay for the image again.**
The idempotency key does not help; this is the *same* run retrying internally, not a second
submission.

The team already sensed this. `remesh-3d-model.task.ts` carries:

```ts
retry: { maxAttempts: 1 }, // Don't retry - costs money
```

That is an honest response to the risk, but it is the wrong instrument, because it also
surrenders retries for the transient network blips that retries exist to handle. You end up
neither reliable nor resilient.

**What good looks like — checkpointing.** Record the provider's job id durably *before or with*
the paid call, and start every attempt by reading it:

```
attempt starts
  → is there a stored provider job id?
      yes → poll it, do not re-submit      ← resume, do not re-purchase
      no  → submit, and store the id
  → upload   (retries independently)
  → persist  (retries independently)
```

Now each stage retries on its own and the expensive stage happens once. This general shape —
break a multi-step process into stages with durable checkpoints so it can resume — is the core
idea behind **sagas** and durable workflow engines, and it is exactly what Trigger.dev is for.

Two more resilience notes from our code. `persistMeshyModelUrl` **swallows database errors**, so
a run reports success with stale state — silently discarding an error is how a resilience
mechanism becomes a reliability bug. And in Vitest, `dangerouslyIgnoreUnhandledErrors: true`
means an unhandled promise rejection — the exact signature of a swallowed async failure —
cannot fail the test suite. The bug and the thing that would have caught it were disabled in
the same codebase.

## 2.6 Transactions and consistency

**The idea.** A transaction is a set of changes that all happen or none happen. **ACID** —
Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent transactions
do not see each other's half-done work), Durability (once committed, it survives a crash).

The one that bites beginners is **atomicity across steps that are not in the same transaction.**

**In our repo.** In the beat-draft workflow, `persistBeat` can return `{ saved: false }` on a
soft failure **without throwing**, and the workflow then *completes successfully* with a
generated draft and nothing written to the database. Meanwhile a hard database error *does* fail
the step. So the same real-world event — "we could not save this" — has two different outcomes
depending on how it failed.

Downstream, a reader cannot distinguish:

- we generated this beat and stored it, from
- we generated this beat and lost it.

The run says "completed" in both cases.

**What good looks like.** The draft, its critiques, the run trace and the cost record commit in
**one transaction**, and the run's success depends on that commit. If the commit fails, the run
failed. Do not invent a third state that means "succeeded but nothing happened" — that state is
where data loss hides.

If you genuinely want to keep the model output when canonical persistence is refused, store it
explicitly as a rejected artifact with a reason. That is an honest outcome. A success flag
carrying `saved: false` is not.

## 2.7 CAP, and what it actually means here

**The theorem, stated correctly.** In a distributed system, when a **network partition** happens
— machines cannot talk to each other — you must choose between **Consistency** (every read sees
the latest write) and **Availability** (every request gets a non-error response). You cannot
have both *during a partition*.

**The most common misunderstanding.** People say "pick two of three: C, A, or P." That is
wrong and it will mislead you. Partitions are not something you choose; they are something the
network does to you. If you are distributed, P is compulsory. The real choice is: **when a
partition happens, do I return possibly-stale data, or do I return an error?**

**PACELC** is the more useful version, because partitions are rare and the trade-off never
sleeps: *if there is a **P**artition, choose **A** or **C**; **E**lse — in normal operation —
choose **L**atency or **C**onsistency.* Every read replica, every cache, every CDN is you
choosing latency over consistency.

**What this means for us — the honest answer.** Our Postgres is a single primary. Reads and
writes go to one place, so within the database we get strong consistency and there is no CAP
trade-off to make. If you ever add Supabase **read replicas** for speed, you buy latency at the
cost of consistency: a read replica can lag behind the primary, so a user can save a beat and
then not see it. That is the PACELC "else" branch, and it is a real decision, not a free
upgrade.

**But here is the part that matters more for you right now.**

> Our consistency problems are not *inside* Postgres. They are *between* Postgres and everything
> else.

A single beat generation touches: the Postgres database, an LLM provider, blob storage,
Trigger.dev's own state, and the cost ledger. **That** is the distributed system, and none of it
is covered by a database transaction. You cannot `BEGIN; call OpenAI; COMMIT;`.

So the questions that actually pay rent here are not "are we CP or AP." They are:

- If the model call succeeded and the database write failed, what is true? (§2.6)
- If the upload succeeded and the persist failed, do we pay twice on retry? (§2.5)
- If the run says complete, is the beat definitely saved?

That is why the thirty-two actions include atomic persistence and paid-step checkpointing but no
"CAP strategy." Know the theorem so you recognize it when it arrives — and recognize that
today's inconsistency lives in the seams between services.

**A related trap you already hit.** In 2D Canvas, `loadTiles` writes results into a shared store
after an `await` without re-checking which project is active. Switch from project A to project B
while A's request is slow, and A's response overwrites B's view. That is not CAP — it is a race
condition — but it comes from the same root: **state changed while you were waiting, and you
did not re-check it.** The fix is the same shape as the general rule: after any `await`,
re-verify the assumptions you made before it.

## 2.8 Observability and knowing what things cost

**The idea.** Observability is being able to answer questions about a running system that you
did not anticipate. Logging tells you what you thought to print; observability lets you ask new
questions of data already collected.

**In our repo.** SPEC-13 built the right thing: an `llm_calls` table capturing tokens, model,
provider, cost, latency, outcome, project and user; a committed price table; a `npm run spend`
report; and an ESLint rule preventing direct provider SDK imports so calls cannot dodge it. The
write is fire-and-forget, so a metering outage cannot fail a user request — a good design
decision. And a missing price now records the tokens with `costUsd: 0` and names the model as
unpriced, rather than discarding the row. That distinction matters: **"unknown" and "zero" are
different, and conflating them makes your dashboard lie.**

**Where the number is still wrong, and why it teaches something.** The adapter reads
`result.usage` from a Mastra agent run. On a multi-step run, `usage` is the **last step only**;
`totalUsage` is the cumulative figure. Our agents run with `maxSteps` up to 25. So the ledger
can record a small fraction of real spend — and it will look completely healthy, because a
plausible number is more dangerous than a missing one.

Similarly, `lastEmbeddingTokens` is a module-level global read after the call returns. A cache
hit leaves the *previous* call's number in place; concurrent calls race. Shared mutable state
read at a distance is a classic source of quietly wrong numbers.

The lesson: **a measurement needs a test as much as a feature does.** "Two steps using different
models record the combined total" is a test you can write today.

**The input side of the same bill.** Cost has two halves and the ledger currently watches one.
Tokens leave in the response, but they also arrive in the prompt — and the prompt is assembled
from context *plus* whatever conversation memory recalls. Recalled memory is a cache read with
a price attached, and like any cache it needs three decisions you have to make deliberately
because the library will not force them on you: **what the key is** (whose conversation is
this?), **how large it may grow** (how many messages come back?), and **what deletes it** (when
do old threads die?). Miss the key and users share a notebook, or each turn opens a fresh one
and recalls nothing. Miss the bound and the prompt grows until a per-turn cost triples with no
code change and no failing test. Miss the expiry and a table grows forever until someone
notices the storage line on an invoice.

Our repository currently misses all three in different places, which is why Action 31 exists.
The most instructive part is subtler than any of them: three agents declare a ten-message window
and the production chat path never passes a thread id at all, so the window is configuration
that nothing reads. This is the same shape as the eval gate that scored a frozen string and the
ratchet that compared a tree to itself — **a setting is not a behaviour until something executes
it, and only a trace or a test can tell you which one you have.** That sentence is most of what
this document is about.

## 2.9 Quality gates, and why a gate that cannot fail is worthless

**The idea.** A gate is an automated check that stops bad changes. Its value is entirely in its
ability to *say no*. A gate that cannot fail is a comment with a build step.

**Three ways our gates currently cannot say no** — worth studying, because these are the generic
failure modes:

1. **It measures the wrong thing.** `evals/run.ts` scores frozen golden strings rather than live
   agent output. The gate above it works perfectly; it is simply guarding an input that cannot
   change when the agent changes.
2. **The subject can move the goalposts.** Ratchet tests assert `current <= threshold`, where
   the threshold lives in a JSON file **in the same commit**. Raise the number and add the
   violation together and it passes. A threshold must be compared against a **pinned base
   reference**, so loosening it is visible as a diff someone must approve.
3. **It was silently switched off.** ESLint flat config **replaces** rule options when a later
   block matches the same file rather than merging them. A block added with the cost work
   overwrote the cross-domain import ban. Verified by linting a probe file with a positive
   control: `import 'openai'` errors correctly, while `@/domains/game-design` produces no
   diagnostic at all. A rule documented in three places as a hard error does not fire.

The generalizable habit — and honestly the most valuable single practice in this document:

> **Test that your gate fails.** Write the violation, confirm it is caught. Then delete the
> rule and confirm the test goes red. A gate you have only ever seen pass has told you nothing.

There is also a measurement lesson in the ratchet: it counts **lines of text** matched by a
regex. So reformatting changes the count, removing violation A while adding violation B keeps
the total flat, and `process.env["FOO"]` is invisible to a matcher expecting `process.env.FOO`.
Counting syntax requires parsing syntax — an AST — not matching text.

## 2.10 Agent systems — craft, vibe, and measurement

Tracks B and C build a writing system. The concepts are still backend concepts: budgets,
permissions, pipelines, and instruments. The subject matter is fiction craft from
[wgwtest/novel-writing](https://github.com/wgwtest/novel-writing) and a George R. R. Martin
layer that already exists in this repo as `src/mastra/agents/grrm-author/`. If you skip this
section you can still ship Actions 1–8. You cannot ship 9–25 without it.

### The craft catalog is a compiler, not a mood board

Open the skill's `SKILL.md`. It does three things a backend developer already knows under other
names.

**It splits work into stages** — planning, drafting, reviewing — and tells you which reference
file to load for each. That is progressive disclosure: pay for the chapter you need. We
implement it as three skill levels (name+description always, body on match, scripts run rather
than read). Loading all ten bodies on every critic call is ~15–20k tokens of mostly irrelevant
text. Loading ten names is ~1.2k. Cutting the catalog to four skills was a misunderstanding of
that cost model.

**It demands located diagnostics.** `revision-checklist.md` requires Location, Problem type,
What happens now, Why it fails, Revision direction, and "Should this become a project rule?"
That is a linter finding. We encode it as a Zod schema so "the pacing is a bit stiff" cannot
be represented. Project rules override the general skill — same precedence as a repo's
`CLAUDE.md` over a generic system prompt. That is Action 24.

**It splits canon into four layers** (`story-outline-and-causal-summary.md` §4): story facts,
character knowledge, author truth, reveal boundary. The drafting Author gets facts plus *this
POV's* knowledge, and is not given author truth. That is row-level security applied to plot.
It is also most of what people mean by "write with dramatic irony." A prompt that says "don't
spoil the twist" will spoil it the moment the model gets absorbed. A retrieval rule cannot.

The catalog's other hard rules map onto scopes and gates:

| Hard rule in the skill | Where it lives in our system |
|---|---|
| Important characters cannot enter naked | `character-introductions` loaded when the plan flags a first appearance |
| Scene information obeys access limits | `read_canon` + `cognition` scope |
| Cognition must change choice and language | `cognition` scope |
| Viewpoint does not own every decision | `causality` scope |
| Dialogue happens through behavior | `dialogue` scope |
| Protect style-bearing material | `style-fidelity` on the **diff**, so revision cannot "fix" by flattening |
| Every segment earns its place | Law of Motion fields on the plan; concreteness gate |
| Review output must be specific | `Finding` schema |
| Run the bundled checker | `run_prose_check` — rewrite the rules, keep the shape |

You do not need to become a novelist to implement this. You need to treat those documents as
specifications.

### The George vibe is three layers, and only one of them is a prompt

`src/mastra/agents/grrm-author/` already has instructions (Law of Motion: every beat needs
`actionTaken`, `consequence`, `storyStateChange`), a psychology skill (habits, denied desires,
blind contradictions, delayed cost), and an anti-slop skill (emotion labels become behavior;
purple prose, exposition dumps, and plot conveniences are banned). `compose-instructions.ts`
concatenates them.

**And all of that already runs.** `beat-draft-default-deps.ts` routes both the `draft` and the
`revise` step through `statelessGrrmAuthor` — that agent. Every beat this repo has produced was
written with the psychology and anti-slop skills in the prompt.

This is worth dwelling on, because the first version of this document said the opposite. It saw
that the `GrrmAuthorAgent` **class** in the domain barrel has no call sites and concluded the
vibe was unreachable. One is a wrapper nobody imports; the other is the agent that does the
work. *"I could not find a call site"* and *"there is no call site"* are different claims, and
collapsing them is the single most common way an audit ends up confidently wrong. When an
assistant tells you a feature is dead, make it show you the path it walked.

The real defect is quieter and more interesting: the pack ships in every draft, and **nothing
measures whether it helps.** `evals/run.ts` scores a frozen `referenceOutput`, so no change to
psychology or anti-slop could ever move a number. That is not an unreachable feature; it is an
unfalsifiable one, which is worse — it cannot be improved, only believed in.

Split it the way you would split any feature that people describe with adjectives:

**Structure** is engineering, and the catalog already named it: limited POV, unequal knowledge,
sensory concreteness, reveal discipline, motion over mood, embodied dialogue. These belong in
retrieval, schemas, critic scopes, and deterministic checks. They can fail a test on a stubbed
model.

**Texture** splits by direction. *Adding* voice — psychology, cadence, register, the private
per-project overlay — belongs in the drafting prompt, where it already is, because a beat
should be written in voice rather than translated into it afterwards. *Removing* machine tells
— anti-slop, banned phrases, labelled emotions — belongs in a late pass behind a claim check
that forbids adding, dropping or altering a fact. The order matters in one direction only: a
de-slopper that runs before the voice pack strips the idiosyncrasies you just paid for.

**Measurement** is a named GRRM rubric in the pairwise judge: consequence, embodiment,
withheld truth, sensory density, Law of Motion. "It feels like Martin" is not a scorer. If
the pass loses an ablation, you fix the pack — you do not delete the product requirement.

*Working with AI on this:* never accept "add 'write like George R. R. Martin' to the system
prompt" as the implementation. Ask which of the six structural properties still hold when the
model is having a bad day. If the answer is "the prompt," you have a costume.

### Measuring a subjective quality without a judge

The reflex when you want to measure something artistic is to ask another model. Sometimes you
have to. Often there is a **countable proxy**, and it is worth looking for one first, because a
count is free, instant, identical every run, and cannot be argued with.

Distinct character voice is the best example in this system. Every prompt file demands it, no
scorer checks it, and characters blurring into one articulate narrator is the failure readers
notice first in long generated fiction. It sounds like a judgement call. It is not, because the
inverse problem was solved decades ago in **stylometry** — the statistical study of writing
style, used to attribute anonymous documents to authors. Its central finding is counter-
intuitive and worth carrying around: *function words* — `the`, `but`, `of`, `would` — identify a
writer far more reliably than vocabulary or subject matter, because they are unconscious habits
rather than choices, and they survive editing and paraphrase. Run those statistics across
speakers instead of across authors and convergence falls out of the arithmetic.

Three details separate a useful metric from a decorative one, and they generalise well beyond
this case:

- **Score the worst case, not the average.** One vivid character carries a mean while three
  others are interchangeable. The closest pair is the honest number. Whenever you aggregate a
  quality metric, ask what the average is hiding.
- **Separate "different from each other" from "correct."** A cast can be perfectly distinct and
  every one of them wrong for who they are supposed to be. Those are two measurements.
- **Trust the extractor before you trust the score.** The metric needs per-speaker lines, and
  dialogue here is stored as free prose, so something has to parse it back out. A parser that
  silently drops half the lines produces a confident, meaningless number — **worse than no
  metric at all**, because now you have a green dashboard. Test the extractor on interruptions,
  unattributed lines, and one-speaker scenes before the metric is allowed into the suite.

*Working with AI on this:* when you ask for a way to measure something that sounds subjective,
ask for the deterministic proxy **first** and the LLM judge second. Left to itself an assistant
proposes the judge every time, because a judge is easier to write — and it will quietly cost you
money on every run forever.

### Five more backend ideas the harness rests on

**The context window is a budget.** Quality degrades as it fills. A model that read forty
chapters before writing one paragraph is worse at that paragraph. Retrieval depths (task /
near / far) and skill disclosure exist to spend that budget on purpose.

**A subagent exists to protect a context window.** Continuity may read 60k tokens and return
400 tokens of findings. The test is mechanical: does it read far more than it returns? If
not, it should be a function call. Five critic scopes are five isolated reads, not five
personalities.

**Put the plan in code.** `beat-forge`, `continuity-sweep`, and `autonomous-episode` are
showable because a workflow is inspectable. Intermediate results live in step outputs, so the
Conductor never accumulates five critiques, a revision and a de-slop pass in one window.

**Goodhart's law will eat the revision loop.** The fastest way to clear findings is to delete
anything interesting. `style-fidelity` on the diff, and a counter-metric on the quality gate,
are how you stop the optimizer flattening the book.

**You measure additions; you do not argue them.** Ablation decides whether to add an
`anchoring` scope, not whether Martin stays. Calibration, noise floor, and pairwise
counterbalancing decide whether a number is real. Today's eval scores a frozen string, so no
voice-pack change can move it — that is construct invalidity, the same bug as a metric named
"agent quality" that never called the agent.

### How to study this with an assistant

1. Read `novel-writing/SKILL.md` once, then `revision-checklist.md` and
   `story-outline-and-causal-summary.md` §4. Those three files *are* the spec for Findings,
   rule promotion, and canon layers.
2. Read `src/mastra/agents/grrm-author/instructions.md` and the two `skills/` files, then
   follow `statelessGrrmAuthor` from `beat-draft-default-deps.ts` to see where they already
   run. Those three files *are* the voice pack, and it is live.
3. When an assistant proposes a new agent or a seventh workflow, ask: "which catalog file
   does this implement, and what ablation would delete it?"
4. When an assistant proposes a vibe prompt, ask: "show me the test that fails if we skip
   this pass."
5. When an assistant says a feature is unreachable, ask it to name the import chain it
   searched. This document made that mistake about this exact agent.

---

# Part 3 — The thirty-two actions as a syllabus

`actions.md` has the tickets (WHAT / HOW / WHERE / Acceptance) plus a teaching column on
every action. This part is the syllabus: what to learn *in what order*, and how the tracks
fit together. Do not skip to Track B because it is more fun. Track B on an untraced,
unauthenticated, softly-persisted pipeline is a demo that lies.

### Track A — you already know these names from Part 2

| Actions | You are practising | The trap |
|---|---|---|
| 1 | Authn vs authz; mass assignment | A test that mocks `requireAuth` |
| 2 | Transactions; one way of failing | `{saved:false}` *and* a thrown error for the same event |
| 3 | Logs vs metrics vs traces | Instrumenting call sites instead of seams |
| 4 | Reproducible builds; silent success | Grepping human text for the word "error" |
| 5 | Config replace-not-merge; positive controls | A ratchet that compares a tree to itself |
| 6 | Per-step vs cumulative usage | Module-global `lastEmbeddingTokens` under concurrency |
| 7 | Construct validity | A gate named after the agent that scores a fixture |
| 8 | Idempotency vs resumability | `maxAttempts: 1` as a substitute for a checkpoint |
| 27 | Policy at the platform vs policy in your code | Expecting a gateway filter to protect made-up facts it has never heard of |
| 31 | Cache keys, bounds and retention | Accepting `lastMessages: 10` as a behaviour when nothing reads it |

Work 1 → 3 → 2 → 4 first. Then 18 (trace-contract tests — Track C, but free and writable
today) and 6 (otherwise every later dollar figure is a lower bound), then 31, which is the same
lesson as 6 applied to a different input. 5, 7, 8 can wait until the harness exists; 7's
live-quality tier needs the pipeline.

### Track B — the writing system

Read this as one sentence: **one front door, three keys, eight tools, a four-layer library
card, a form critics must fill in, five inspections from the craft catalog, the whole catalog
in the pocket, three machines you can demo, and Martin on the assembly line.**

- **9 Conductor.** Invariants live in the domain, not in the URL. The George agent with no
  call site is this lesson in costume.
- **10 Three modes (read / draft / commit).** Matches the catalog's planning / drafting /
  reviewing split. Withhold tools; do not instruct restraint.
- **11 Eight tools.** `brainstorm` is a doorbell on Muse, which already exists.
  `search_manuscript` is literal because plant/payoff is a string problem.
- **12 Four-layer canon.** Catalog §4. This is dramatic irony as RLS. If you remember one
  Track B idea, remember this.
- **13 Finding + BeatPlan + Law of Motion.** Catalog checklist + GRRM instructions, as
  schemas. Vague becomes a validation error.
- **14 Five scopes, one agent.** Continuity, causality, cognition, dialogue, style-on-the-diff.
  Cognition and dialogue are the two the minimum draft cut, and they are the Martin-heavy
  pair. Isolation is the reason they are subagent calls.
- **15 Full catalog, disclosed.** All ten [novel-writing](https://github.com/wgwtest/novel-writing)
  files at L1. Bodies on match. The cost of "using the catalog" is ~1.2k tokens of index,
  not 20k of bodies.
- **16 Three workflows.** `beat-forge` (compiler), `continuity-sweep` (episode fan-out on
  code that exists), `autonomous-episode` (durable showcase with `autoApprove` retired).
- **17 Split the George vibe.** The pack already drafts every beat, so this is not wiring.
  Structure is already in 12–14; voice stays in the drafting prompt; anti-slop moves to a late
  pass behind a claim check; both get disclosed per stage instead of concatenated into every
  call. Measure with the GRRM rubric (21) — starting with an ablation of the pack itself.
- **26 One pipeline for every artifact.** Beats get planned, checked and approved; everything
  else in the bible gets a chatbot and a hidden paragraph of instructions. The lesson is
  generalisation: one machine with a per-type configuration, not two machines.
- **28 The latency budget.** Everything above has to finish before the platform hangs up. The
  human approval pause is what makes that possible, by splitting one long request into two
  short ones — a deadline is a design input, not an afterthought.
- **30 The chat surface.** Say what is happening in words. A silent spinner and a broken system
  look identical to the person waiting.

### Track C — how you know, including how you know it is Martin

- **18 Trace contracts.** Stub the model, watch the levers. Include "de-slop ran after the
  last revision," "drafting loaded psychology but not anti-slop," and "Author context had no
  author-truth."
- **19 Deterministic linter.** Catalog checker shape. POV-leak is a lookup.
- **20 Golden set.** Include a deceived-POV beat and a delayed-cost beat, or the vibe has no
  exam questions.
- **21 Judge + noise + GRRM rubric.** Counterbalance, other family, length control, human
  labels, two standard deviations. The rubric names consequence, embodiment, withheld truth,
  sensory density, Law of Motion.
- **22 Ablation.** Decides extras (`anchoring`, tournament). Does not delete the floor.
- **23 Gate + dollars per quality point.** Pair every metric with a cheat-catcher.
- **29 Prompt registry.** A prompt is an input to the system, so it is versioned like code and
  measured like a change. Twenty of them currently hide inside UI constant files.
- **32 Voice fingerprints.** Stylometry: function-word frequencies separate speakers better
  than vocabulary does. Score the *closest pair*, not the average, and check the extractor
  before you trust the number.

### Track D — compounding

- **24 `promote_rule`.** The catalog's last question on every finding. Project law overrides
  general craft.
- **25 Model pins.** Kimi for prose — drafting, revision and de-slop; GLM for the five inspections.
  Believe the trace, not the matrix, because a policy layer already remaps some models.

**The one principle behind most of them:** *the host owns truth; the model owns language.*
Any fact a later step depends on is committed by deterministic code. A model may propose a
fact; only your code may commit one. The de-slop pass is allowed to change cadence, not
facts — that is the same principle wearing a leather jerkin.

---
# Part 4 — Trade-offs we have accepted

Every one of these is defensible. What matters is that they are **decisions**, not accidents.

| Trade-off | We chose | We gave up | Right call? |
|---|---|---|---|
| `jsonb` vs strict columns | Flexibility for evolving creative data | Write-time validation; the bill is 1148 read-site guards | Yes — but pay it with contracts (Action 13) |
| Fire-and-forget cost logging | A metering outage never breaks a user request | Guaranteed-complete billing data | Yes, for this domain |
| RLS **and** service role | Server code can do its job | RLS protects nothing at 23 call sites | Yes — provided each site checks ownership |
| Single Postgres primary | Strong consistency, simple reasoning | Read scaling; a single region | Yes at this stage |
| Idempotency key only | Duplicate submissions prevented cheaply | Half-finished runs still re-purchase | **No** — Action 8 |
| `maxAttempts: 1` on paid tasks | No double charge | No retry on transient failures | Stopgap; checkpointing supersedes it |
| Frozen fixtures in evals | Fast, deterministic, free | Cannot detect an agent regression | Fine as *a* tier, wrong as *the* gate |
| Ratchet instead of "fix it all now" | Ships; stops the bleeding | Debt persists; can be gamed | Yes — with Action 5's fixes |
| Local gates, no CI | Fast iteration | Nothing is reproducible or enforced | **No** — Action 4 |

---

# Part 5 — Are we refactoring in a good direction?

**Yes, with one correction.**

**What is genuinely good, and you should keep doing it:**

- The **sequencing instinct** is right. Configuration before metering before job safety before
  quality gates is the correct dependency order, and most teams get this backwards by starting
  with the visible feature.
- **Pilot, then propagate.** The 3D Asset Exporter contracts module is a small, complete, tested
  example of the target pattern. Proving a pattern on one module before rolling it out is
  exactly right, and far better than a big-bang rewrite.
- **The failure modes chosen are honest.** Recording an unpriced model rather than dropping the
  row; returning 404 instead of 403 to avoid id enumeration; `not-applicable` versus `not-run`
  in eval baselines. These are the choices of someone thinking about what the data will mean
  later.
- **Compiler-enforced structure.** `defineOwnedTask` makes a task without a queue or a nonce
  *fail to compile*. That is much stronger than a convention in a document, because it cannot be
  forgotten.

**The one correction — and it is a habit, not a task:**

> You are building mechanisms faster than you are proving they work.

Every package delivered a real, well-designed mechanism. In several cases the last step —
*write the test that proves this can fail* — was skipped, and that is why an import ban silently
stopped firing, a ratchet counter guards nothing, and an eval gate protects a harness that never
calls the model.

The fix is a rule you can apply from the next commit, before any of the thirty-two actions:

> **When you build a guarantee, write the test that breaks it first. If you cannot make it fail
> on purpose, you have not built a guarantee.**

Adopt that and the thirty-two actions become mostly mechanical. Skip it and you will build
thirty-two more excellent mechanisms with the same gap in each. Action 31 is the freshest
example in the file: a ten-message memory window declared in three places and read on none of
the paths a user touches.

The same habit, applied to the agentic system, is Track C. Ablation (Action 22) decides
*additions* past the floor. The floor itself — five catalog-mapped scopes, the full skill
index, the voice pack — is a product requirement. If the pack does not beat the noise floor,
fix the pack. The first ablation to run is diagnostic rather than gating: the voice pack has
been in every draft this repo ever produced, and nobody has a number for it.

**What to do in what order** — this is the same order `actions.md` gives, and the reasoning
behind it is worth understanding rather than just following:

1. **Action 1 (identity and ownership)** — a real security exposure, and it teaches the single
   most important concept in backend work.
2. **Action 3 (the run trace)** — before any agent work. Retrofitting observability into a
   running pipeline costs several times what building it in costs, and every later action needs
   something to assert against.
3. **Action 2 (atomic persistence)** — small, contained, and it teaches transactions properly.
   The new pipeline commits four things at once, so this must be right before that exists.
4. **Action 4 (CI)** — until something runs automatically, no other fix can be shown to hold.
5. **Action 18 (trace-contract tests)** — free, fast, and writable against the pipeline that
   exists today. It is the first point at which "did the right things run?" becomes answerable.
6. **Action 6 (cost as a total)** — the new pipeline is multi-step everywhere, so an
   under-reporting adapter would make every later measurement wrong in the same direction.
7. Then Track B (including **Action 17, the George split** — not optional, not an appendix),
   then the rest of Track C, in the order given in `actions.md`.

Notice what that order encodes: **fix what is dangerous, then build what makes things visible,
then build the thing itself.** Actions 5 and 8 are real and stay P1, but neither is bleeding right
now — and Action 5 in particular guards a boundary that currently has zero violations, which is
exactly why it moved down.

---

# Glossary

**ACID** — Atomicity, Consistency, Isolation, Durability: the guarantees a database transaction
gives you.
**Atomicity** — all changes happen, or none do.
**CAP** — during a network partition, choose consistency or availability. See PACELC.
**Cascade delete** — deleting a parent row automatically deletes its children.
**Context window** — everything a model can see during one call; a hard, scarce budget.
**Context isolation** — running work in a separate context so its bulk never reaches the parent.
**Contract** — the agreed shape of data crossing a boundary.
**Drift** — two descriptions of the same thing disagreeing over time.
**Goodhart's law** — when a measure becomes a target, it stops being a good measure.
**Idempotent** — doing it twice has the same effect as doing it once.
**Index** — a lookup structure that makes reads fast and writes slightly slower.
**Law of Motion** — GRRM author gate: every beat names a concrete act, its immediate consequence,
and the before→after state change.
**Problem type** — closed enum of narrative defects from the novel-writing revision checklist.
**Mass assignment** — letting a client-supplied object set fields it should not.
**Multi-tenancy** — many customers sharing one database.
**Nonce** — a value used once, to recognize a repeated request.
**PACELC** — if Partition, choose A or C; Else, choose Latency or Consistency.
**Parse, don't validate** — convert untrusted data into a trusted type once, at the edge.
**Progressive disclosure** — load reference material in stages, paying only for what is used.
**Race condition** — the result depends on timing between concurrent operations.
**Ratchet** — a counter that may only move in the improving direction.
**Reliability** — correct when things work. **Resilience** — sensible when they break.
**RLS (Row Level Security)** — Postgres deciding per row whether you may see it.
**Saga** — a long process split into steps with checkpoints, so it can resume or compensate.
**Service role** — a privileged database role that bypasses RLS.
**Trust boundary** — where data stops being yours and must be verified.

---

# Further reading

Ordered by how directly it applies to what you are doing next.

**Supabase and Postgres**
- [Supabase Database overview](https://supabase.com/docs/guides/database/overview) — the map of
  everything the database layer gives you.
- [Securing your data / Row Level Security](https://supabase.com/docs/guides/database/secure-data)
  — read before exposing any table to a client. Directly relevant to §2.2.
- [Query performance and optimization](https://supabase.com/docs/guides/database/query-optimization)
  — indexes and the query planner; relevant to §2.3.
- [Roles and permissions](https://supabase.com/docs/guides/database/postgres/roles) — what
  `anon`, `authenticated` and `service_role` actually mean.
- [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres) —
  connection pooling; matters once you run many concurrent background jobs.
- [Deployment and branching](https://supabase.com/docs/guides/deployment) — migration discipline,
  relevant to the schema drift in §2.3.

**Concepts**
- Martin Kleppmann, *Designing Data-Intensive Applications* — the standard text; chapters 5, 7
  and 9 cover replication, transactions and consistency far better than any blog post.
- Daniel Abadi's PACELC paper — the correction to CAP described in §2.7.
- "Parse, don't validate" (Alexis King) — the idea behind §2.4 and SPEC-16.
- The Twelve-Factor App, factor III (Config) — what SPEC-12 implemented.

**In this repo**
- `docs/ARCHITECTURE.md` — the module blueprint and dependency rules.
- `.cursor/rules/eslint-boundaries.mdc` — the boundary rules, including the cross-domain ban that
  Action 5 restores.
- `src/domains/3d-asset-exporter/contracts/` — the reference contracts implementation. If you
  read one piece of *code* from this list, read this one.
- `src/mastra/agents/grrm-author/` — instructions, psychology skill, anti-slop skill. If you
  read one piece of *craft wiring* from this list, read this one.

**Craft catalog (required reading for Track B)**
- [wgwtest/novel-writing](https://github.com/wgwtest/novel-writing) — start at `SKILL.md`, then
  `references/revision-checklist.md` and `references/story-outline-and-causal-summary.md` §4.
