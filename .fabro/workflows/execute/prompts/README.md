# Moved

Execute stage prompts live in **`.agents/execute/`** (repo root).

Fabro loads them via `prompt="@../../../.agents/execute/<stage>.md"` in `workflow.fabro`.

Do not add prompt files here — they will drift from `.agents/`.
