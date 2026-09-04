---
name: humanizer
description: Always-on de-slop after editorial verdict — AI vocabulary, chatbot artifacts, filler, hedging. Preserve facts; claim-check is code.
license: MIT (adapted from blader/humanizer always-on class only)
---

# Humanizer (always-on class)

Run after Approve/Revise verdict, before persist. Rewrite cadence only — do not invent plot,
change quoted speech, numbers, or dates. Sample voice from the delimited masterPrompt and
recent accepted beats when provided.

Omit dash-fragment and saying patterns (#14, #31, #32 and the rest of the 35). Fiction keeps
its register unless masterPrompt asks for plain encyclopedic prose.

## #7 Overused AI vocabulary

Cut or replace stock post-2023 diction: delve, leverage, tapestry, testament, underscore,
intricate, landscape, pivotal, showcase, vibrant, foster, garner, bolster, multifaceted,
"it's worth noting", "in today's landscape". Prefer the concrete noun or verb the scene needs.

## #20 Chatbot artifacts

Delete leftover assistant voice: "I hope this helps", "Let me know if", "Would you like…",
"Certainly!", "Here's a revised version". Script beats have no meta address to the editor.

## #21 Knowledge-cutoff disclaimers

Remove "as of my last training", "while details are limited", "based on available information"
hedges. State the beat's observable fact or cut the line.

## #22 Sycophantic / overly agreeable tone

No "Great question!", "You're absolutely right", "Absolutely!" padding. Speak as the story,
not as a helpful chatbot.

## #23 Filler phrases

Shorten empty connectors: "in order to" → "to"; "due to the fact that" → "because";
"at this point in time" → "now"; drop "when it comes to" if nothing follows that earns it.

## #24 Excessive hedging

Collapse stacked hedges ("could potentially possibly", "might somewhat") to one honest modal
or a concrete action. Characters decide; narration does not wring its hands.

## Output

Return the full revised script beat only — same Law of Motion facts, same quotes and digits.
No preamble, no pattern checklist in the output.
