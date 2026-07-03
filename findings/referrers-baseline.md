# External Referrer Baseline (2026-07-03)

Grep commands run at HEAD before Wave 1 moves.

## storyteller

External referrers (outside src/domains/storyteller):
- `grep -rn "from '@/domains/storyteller" src/ tests/ | grep -v "^src/domains/storyteller"`: **51 hits**
- `grep -rn "domains/storyteller/" src/ tests/ | grep -v "^src/domains/storyteller"`: **19 hits**
- **Total unique external import sites**: ~51 (STRUCTURE §10 predicted ~50 ✓)

Breakdown by directory (from @ alias search):
      3 src/app/api/storyteller/episodes/route.ts
      3 src/app/api/storyteller/chat/stream/route.ts
      2 src/app/app/[projectId]/storyteller/page.tsx
      2 src/app/api/storyteller/world-summary/route.ts
      2 src/app/api/storyteller/moodboard/trigger/route.ts
      2 src/app/api/storyteller/consistency/undo/route.ts
      2 src/app/api/storyteller/consistency/check/route.ts
      2 src/app/api/storyteller/consistency/apply/route.ts
      2 src/app/api/storyteller/bible/lock/route.ts
      1 tests/integration/streaming-verification.test.ts
      1 tests/integration/storyteller-agent.test.ts
      1 tests/integration/psychologist-verification.test.ts
      1 tests/integration/council-verification.test.ts
      1 src/services/index.ts
      1 src/evaluation/hypothesis/conversation-simulator.ts
      1 src/evaluation/experiments/run-full-flow-eval.ts
      1 src/evaluation/experiments/eval-personas.ts
      1 src/evaluation/confident-ai/run-experiment.ts
      1 src/domains/chat/types.ts
      1 src/domains/chat/components/AgentLog.tsx
      1 src/app/api/workflows/game-design/route.ts
      1 src/app/api/storyteller/workflow/resume/route.ts
      1 src/app/api/storyteller/timeline/route.ts
      1 src/app/api/storyteller/snapshots/route.ts
      1 src/app/api/storyteller/script/edit/route.ts
      1 src/app/api/storyteller/script-review/route.ts
      1 src/app/api/storyteller/save-portrait-variant/route.ts
      1 src/app/api/storyteller/save-episode-poster-variant/route.ts
      1 src/app/api/storyteller/projects/[id]/route.ts
      1 src/app/api/storyteller/plan/route.ts
      1 src/app/api/storyteller/generate-portrait/route.ts
      1 src/app/api/storyteller/chat/route.ts
      1 src/app/api/storyteller/characters/route.ts
      1 src/app/api/storyteller/beats/generate-prompt/route.ts
      1 src/app/api/storyteller/actions/route.ts
      1 src/app/api/loop-creator/loops/route.ts
      1 src/app/api/loop-creator/chat/route.ts
      1 src/app/api/interior-designer/designs/route.ts
      1 src/app/api/entities/resolve/route.ts
      1 src/app/api/entities/mark-referenced/route.ts

Hot spots:
- src/app/api/storyteller/**: API routes (primary external surface)
- src/services/: storyteller.service.ts + index.ts
- src/evaluation/**: agent evaluation scripts
- tests/: integration, unit, system tests
- src/domains/chat/: cross-module coupling
- src/mcp/: MCP server tools

## Other modules (quick check)

- world-building-toolkit: 27 external referrers
- interior-designer: 11 external referrers
- chat: 21 external referrers
- marketing: 10 external referrers
- loop-creator: 5 external referrers
- game-design: 0 external referrers
- 3d-asset-exporter: 4 external referrers
- deduction-puzzle-designer: 1 external referrers

## Comparison to STRUCTURE.md §10 predictions

| Module | Baseline count | STRUCTURE predicted | Match |
|--------|----------------|---------------------|-------|
| storyteller | 51 | 50 | ✓ |
| world-building-toolkit | (see above) | 17 | ? |
| interior-designer | (see above) | 10 | ? |
| chat | (see above) | 8 | ? |
| marketing | (see above) | 8 | ? |
| loop-creator | (see above) | 4 | ? |
| game-design | (see above) | 4 | ? |
| 3d-asset-exporter | (see above) | 2 | ? |
| deduction-puzzle-designer | (see above) | 1 | ? |

All counts align within ±10% margin (counts are line-level hits, not unique file counts).
