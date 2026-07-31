---
name: core-web-vitals
description: Lab Core Web Vitals for the marketing landing — production-only audits, full next build pitfalls, LCP/TBT traps, and the npm run audit:cwv workflow. Load before claiming CWV scores or running lighthouse against /.
---

# Core Web Vitals + production build (landing)

Use this whenever you optimize `/` (marketing), run Lighthouse / `audit:cwv`, or need a **representative** performance number. Dev-server scores are not evidence.

Canonical audit script: `scripts/audit-cwv.mjs` · `npm run audit:cwv`  
Reports: `.local/tmp/cwv-audit/` (gitignored) · summary `latest-summary.json`  
Landing: `src/domains/marketing/ui/LandingPage/` · shared panel classes in `…/constants/landing-section.ts`

---

## Mandatory measurement recipe

```bash
# 1) Stop anything holding .next (dev + old prod + stuck build)
lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR>1{print $2}' | sort -u | xargs kill 2>/dev/null
lsof -nP -iTCP:3100 -sTCP:LISTEN | awk 'NR>1{print $2}' | sort -u | xargs kill 2>/dev/null
pkill -f next-build 2>/dev/null
rm -f .next/lock

# 2) Full production build (do not race with next dev)
npm run build

# 3) Serve prod on a free port (keep 3000 for optional later)
npx next start -p 3100

# 4) Warm + audit (mobile uses LH mobile throttle; desktop uses desktop-config)
curl -s -o /dev/null http://127.0.0.1:3100/
npm run audit:cwv -- --url http://127.0.0.1:3100/ --form-factor mobile
npm run audit:cwv -- --url http://127.0.0.1:3100/ --form-factor desktop
```

**Never** report CWV from `next dev`. Webpack HMR, unminified chunks, and extensions destroy the signal.

Run **2–3** mobile audits after a warm request — first cold hit can be 70 while warm is 95+.

Target: **≥95** mobile and desktop on this recipe.

---

## Issues we hit (and the fix)

### 1. Auditing the wrong server

| Symptom | Cause | Fix |
| --- | --- | --- |
| Score ~35–60, multi‑MB JS, 40s TTI | Lighthouse hit `next dev` | Always `build` + `next start` |
| All metrics `null`, score `0` | Nothing listening / chrome interstitial | `curl` 200 before audit; restart `next start` |
| `CHROME_INTERSTITIAL_ERROR` / redirect to `chrome-error://` | Prod process died or never bound | Check `lsof -iTCP:3100`; read `.local/tmp/cwv-prod-server.log` |

### 2. Full `npm run build` fights `next dev`

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Another next build process is already running` | Stale `.next/lock` or zombie `next-build` | `pkill -f next-build`; `rm -f .next/lock` |
| Build log stuck on “Collecting build traces”, no `EXIT:` | Prior build hung; new build aborted early | Kill lock holder; one build at a time |
| Dev returns 500 / missing modules mid-edit | Build rewrote `.next` while `next dev` used it | Never build and dev on the same `.next` concurrently |
| `no BUILD_ID` after “success” | Build killed mid-trace | Re-run build to completion; confirm `.next/BUILD_ID` |

Prefer **port 3100** for prod audits so a human can keep (or restart) `next dev` on 3000 **after** the build finishes — not during.

### 3. Desktop scores looked “broken” (~65–80) while mobile was fine

| Symptom | Cause | Fix |
| --- | --- | --- |
| Desktop LCP ~2.4–5s, score mid‑70s | `audit-cwv.mjs` set `throttlingMethod: 'simulate'` **without** desktop config → mobile slow‑4G + 4× CPU on desktop | Use `lighthouse/core/config/desktop-config.js` for `--form-factor desktop` (already wired in `scripts/audit-cwv.mjs`) |

After the fix, desktop correctly lands ~**99–100** with LCP sub‑second on this landing.

### 4. LCP regressions from “enhance after idle”

| Symptom | Cause | Fix |
| --- | --- | --- |
| LCP jumps to ~2s exactly when FX turn on | Static → Enhanced DOM swap; new node becomes LCP | One DOM structure from first paint; never swap the hero tree |
| LCP = filtered `WORLDS` `h1` at idle timeout | SVG `filter` / paint rect expands when filter enabled later | Prefer **no** SVG displacement on the LCP path; CSS typography only |
| Nested invalid `h1` + glow layers | `LiquidDistortionText` structure | Drop FX from hero critical path; keep BleedingText / liquid FX off LCP |
| `elementRenderDelay` huge, filmstrip dark then flash | Framer opacity/y on hero; spring from 0 | No motion opacity on LCP section; plain `<section>` |

Landing hero contract: **server-rendered** Syne headline in first HTML (`LandingHero` + `HeadlineVariant`), no lucide on that path.

### 5. Fonts stealing LCP / bandwidth

| Symptom | Cause | Fix |
| --- | --- | --- |
| Three woff2 on `/` (Inter + Mono + Syne) | Root layout applied all `next/font` variables + `font-sans` / `font-mono` | Root: Syne only. Marketing layout adds JetBrains Mono (`font-mono` / default `h1–h6`). Inter only in `(workspace)` / `(auth)` |
| Late LCP after FCP / missing Syne | `display: optional` drops the webfont if it misses ~100ms | Syne: `display: 'swap'`, `preload: true`, `adjustFontFallback: true` |

### 6. Main-thread / TBT from marketing providers

| Symptom | Cause | Fix |
| --- | --- | --- |
| Auth + RQ + toast + TopLoader on public `/` | Root `layout.tsx` wrapped every route | `AppProviders` only under `(workspace)` + `(auth)`. Marketing CTAs → `/login` |
| `web-vitals` / HUD in prod bundles | Static imports in root layout | `DebugToolsMount` client island; **dev-only**; dynamic-import `web-vitals` inside effects |
| `react-scan` breaks webpack (`REACT_GRAB_VERSION`) | Static/dynamic import of broken package graph | `import(/* webpackIgnore: true */ 'react-scan')` + never load unless perf flag |
| `ssr: false` with `next/dynamic` in Server Component layout | Next 16 forbids it | Thin `'use client'` mount (`DebugToolsMount`) |

### 7. Three.js / GLB / below-fold JS

| Symptom | Cause | Fix |
| --- | --- | --- |
| GLBs ~124MB on first load | Eager `ThreeDIcon` | Lite GLBs (`npm run marketing:glb-lite`), `ViewportGatedThreeDIcon`, canvas budget |
| Three.js in initial graph | Static `import * as THREE` | `import('three')` inside effect when `showCanvas` |
| TurbulentBackground + deep sections in first JS | Static imports on `LandingPage` | Scroll-gate: CSS placeholder first; dynamic sections after scroll (`LandingDeferred`) |
| Login page chunk on `/` | `next/link` prefetch | `prefetch={false}` on marketing CTAs |

### 8. Flaky lab scores

| Symptom | Cause | Fix |
| --- | --- | --- |
| Mobile 70 then 96 same build | Cold start / CPU contention / dead server mid-batch | Warm with `curl`; serialize audits; ensure `http=200` every time |
| Score 0 mid-loop | Background `next start` exited | Restart prod; don’t assume long-lived nohup stayed up |

---

## Landing architecture (CWV-relevant)

```
Root layout          → Syne variable only; no Auth/RQ; DebugToolsMount (dev only)
(marketing)/page     → LandingPage (server shell)
  LandingNavStatic   → logo + CTA in first HTML
  LandingHero        → LCP text (server)
  LandingClientMount → client island → LandingDeferred (scroll-gated WebGL + sections)

(workspace)/(auth)   → AppProviders + Inter/Mono + NextTopLoader
```

Shared chrome: `LANDING_SECTION_PANEL_CLASS`, `LANDING_ABSOLUTE_OVERLAY_CLASS` in `landing-section.ts`.

---

## Agent checklist before claiming “95+”

1. [ ] `npm run build` finished with `EXIT:0` and `.next/BUILD_ID` present  
2. [ ] `next start` responds `200` on the audit URL  
3. [ ] Mobile **and** desktop via `audit:cwv` (desktop config, not mobile throttle)  
4. [ ] At least one **warm** mobile rerun  
5. [ ] LCP element is the intended hero text (not a late FX / filter node)  
6. [ ] No claim based on DevTools against `next dev` or an extension-polluted browser profile  

---

## Related

- `docs/CORE-WEB-VITALS-LANDING.md` — product plan (if present)  
- `.cursor/rules/quality-gates.mdc` — scoped gates during work; full build is for CWV / commit  
- Skill `typecheck-scoped` — do **not** substitute full-repo `tsc` for CWV measurement  
