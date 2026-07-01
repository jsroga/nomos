### [HIGH] Unauthenticated workflow resume endpoint exposes and mutates suspended runs
- Location: `src/app/api/storyteller/workflow/resume/route.ts:20-99`
- Issue: Neither `POST` nor `GET` performs authentication or project/session ownership checks before reading from or mutating `workflowStore`.
- Attack: Any unauthenticated caller can enumerate suspended workflows via `GET /api/storyteller/workflow/resume` (which returns `runId`, `stepId`, `projectId`, and suspension time), then resume arbitrary runs with attacker-chosen options via `POST`. That crosses the trust boundary for in-app workflow control and can reveal project metadata while altering workflow state.
- Fix: Require auth on both methods and verify the caller owns the workflow/project before listing or resuming. If this endpoint is intended for internal use only, move it behind a server-only path or enforce a signed internal token.

### [HIGH] Auth bypass via client-controlled `x-bypass-auth` header on episode creation
- Location: `src/app/api/storyteller/episodes/route.ts:41-80`
- Issue: `POST` skips `requireAuth()` whenever the request includes `x-bypass-auth: system`. Because this is a normal browser-settable header, any client can opt into the bypass and create episodes without authentication or access checks.
- Attack: An attacker can send a direct `fetch()` request with `x-bypass-auth: system` and arbitrary `projectId`, `title`, `sequence`, etc., causing privileged writes through `supabaseAdmin` without proving project ownership. This violates the server-only write boundary and can pollute or manipulate projects.
- Fix: Replace the header-based bypass with a server-only credential or internal-only route, or remove the bypass entirely and require auth plus project access checks for all public requests.

### Security verdict
- No critical issues; 2 high issues.