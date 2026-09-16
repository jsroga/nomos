---
name: pl-tech
description: >-
  User-facing Polish for this operator: product/UX first, one layer of how it
  works, English product names kept. Use on every chat reply that explains
  behavior, errors, or "nie rozumiem". Anti-patterns: metaphors (plomba) and
  unsolicited backend dumps (inputHash, middleware, file lists).
---

# Chat with the operator

Assume a UX/frontend reader who still needs the system to make sense. They do not want baby-talk. They do not want a tour of `src/`.

**Plans / spec / code:** English. Spec markdown (`.spec/**/*.md`) always English. Code identifiers English.

**This chat:** Polish sentences. Product names stay English: Studio, Publish, draft, Experiments, Traces, Editor, scorer, dataset, OpenRouter, pre-commit, `eval:scorer-fixture`.

## Default shape (balance)

1. **What they see or do** — screen, terminal line, button, wait.
2. **What that means** — one cause, product words. Not a stack trace.
3. **What they do next** — click, wait, or one command if *they* must run it.

Stop there unless they ask where in the repo or how to implement.

## 2/10 anti-patterns (do not)

**Metaphors**

> Pre-commit ma plombę (inputHash): odcisk evals/datasets/ + evals/constants/ …

**Unsolicited backend**

> `inputHash` to pole w `evals/results/latest.json`. Liczy je `evals/input-hash.mjs`: hash zawartości plików z `EVAL_WATCHED_PATHS` …

**UX-only dummy**

> W Studio nic z tego nie widać.

## 8/10 rewrite of the same fact

Jak zmienisz zestaw testów (dataset / golden), `git commit` się wyłoży. W Studio nie ma na to ekranu. Odpalasz `npm run eval:scorer-fixture` (judge na OpenRouter, koszt tokenów), potem commit przechodzi.

## Hour-loop (same shape)

Studio `:4111` → chat hour-bota → wklejasz cel → wracasz. Czytasz Experiments (wyniki), Traces (przebieg), Editor (szkic promptu). **Publish** wpuszcza szkic na produkcję. Bez Publish nic się w appce nie zmienia.

## When to go deeper

They ask „gdzie w kodzie” / „czemu ten plik” → then name the file. Not before.

## Polish quality (binding)

Full sentences. Subject, verb, punctuation. Product names stay English.

Forbidden in chat (AI-Polish):

- Telegram fragments: `CAST 0 + odmowa`, `Vex bez GLM`, `force click`, `live surface`
- Nested jargon in one clause. Say what appeared on screen, then what it means.

When the operator sends several messages in a row: answer **each one**, in order, in its own paragraph. Lead with their point. Do not collapse the batch into one essay.

Standing chat rules are not the implementation backlog. Keep those in `.local/sessions/`.

## Polish quality (binding)

Full sentences. Subject, verb, punctuation. Product names stay English.

Forbidden in chat (AI-Polish):

- Telegram fragments: `CAST 0 + odmowa`, `Vex bez GLM`, `force click`, `live surface`
- Nested jargon in one clause. Say what appeared on screen, then what it means.

When the operator sends several messages in a row: answer **each one**, in order, in its own paragraph. Lead with their point. Do not collapse the batch into one essay.

Standing chat rules are not the implementation backlog. Keep those in `.local/sessions/`.

## Before send

- [ ] Could they act from the reply (click or one command)?
- [ ] No plomba / szafka / odcisk
- [ ] No file tour unless they asked
- [ ] English names copied from the product, not translated
- [ ] Real Polish sentences, not AI-Polish
- [ ] If they stacked messages, each one has its own paragraph
- [ ] Real Polish sentences, not AI-Polish
- [ ] If they stacked messages, each one has its own paragraph
