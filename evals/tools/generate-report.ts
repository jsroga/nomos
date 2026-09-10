/**
 * Standalone eval dashboard generator.
 *
 * Reads the latest eval run (evals/results/latest.json) and emits a
 * self-contained static HTML report at evals/reports/latest.html.
 *
 * This replaces the former in-app /evaluation dashboard: evals now have a
 * single home under evals/ and are viewed via `npm run eval:dashboard`.
 */
import fs from 'fs'
import path from 'path'
import type { MultiVariantReport, ScenarioMetrics, VariantReport } from '../types'

const ROOT = process.cwd()
const RESULTS = path.join(ROOT, 'evals/results/latest.json')
const OUT_DIR = path.join(ROOT, 'evals/reports')
const OUT_FILE = path.join(OUT_DIR, 'latest.html')

const METRIC_KEYS: (keyof ScenarioMetrics)[] = [
  'magicScore',
  'consistency',
  'hallucination',
  'personaFidelity',
  'latencyMs',
]

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function fmt(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}

function metricsRow(label: string, m: ScenarioMetrics): string {
  const cells = METRIC_KEYS.map(k => `<td>${fmt(m[k])}</td>`).join('')
  return `<tr><th scope="row">${esc(label)}</th>${cells}</tr>`
}

function variantSection(variant: VariantReport): string {
  const header = METRIC_KEYS.map(k => `<th>${esc(k)}</th>`).join('')
  const scenarioRows = Object.entries(variant.scenarioMetrics)
    .map(([scenario, m]) => metricsRow(scenario, m))
    .join('')

  const logs = (variant.exampleLogs ?? [])
    .map(
      log => `
      <details class="log">
        <summary><span class="score">${fmt(log.score)}</span> ${esc(log.scenario)} · ${esc(log.id)}</summary>
        <div class="log-body">
          <p><strong>Input</strong></p><pre>${esc(log.input)}</pre>
          <p><strong>Output</strong></p><pre>${esc(log.output)}</pre>
          ${Object.entries(log.reasoning ?? {})
            .map(([k, v]) => `<p><strong>${esc(k)}</strong>: ${esc(v)}</p>`)
            .join('')}
        </div>
      </details>`,
    )
    .join('')

  return `
    <section class="variant">
      <h2>${esc(variant.name)}</h2>
      <pre class="config">${esc(JSON.stringify(variant.config, null, 2))}</pre>
      <table>
        <thead><tr><th scope="col">metric</th>${header}</tr></thead>
        <tbody>
          ${metricsRow('overall', variant.overallMetrics)}
          ${scenarioRows}
        </tbody>
      </table>
      ${logs ? `<h3>Example logs</h3>${logs}` : ''}
    </section>`
}

function render(report: MultiVariantReport): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Eval report · ${esc(report.id)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 2rem; background: #050505; color: #e5e5e5;
         font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .meta { color: #8a8a8a; margin-bottom: 2rem; font-family: ui-monospace, monospace; }
  .variant { border: 1px solid #1e1e1e; border-radius: 12px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; background: #0b0b0b; }
  .variant h2 { margin: 0 0 .75rem; font-size: 1.1rem; color: #8ea2ff; }
  table { border-collapse: collapse; width: 100%; margin: .5rem 0 1rem; }
  th, td { padding: .4rem .6rem; text-align: right; border-bottom: 1px solid #161616; font-family: ui-monospace, monospace; }
  th[scope="row"], thead th:first-child { text-align: left; color: #b5b5b5; }
  .config { background: #111; padding: .6rem .8rem; border-radius: 8px; color: #9aa; overflow-x: auto; }
  details.log { border: 1px solid #161616; border-radius: 8px; margin: .4rem 0; padding: .2rem .6rem; }
  details.log summary { cursor: pointer; }
  .score { display: inline-block; min-width: 3ch; color: #7fd18a; font-family: ui-monospace, monospace; }
  .log-body pre { background: #111; padding: .6rem .8rem; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
</style>
</head>
<body>
  <h1>Evaluation report</h1>
  <div class="meta">${esc(report.id)} · ${esc(report.timestamp)} · scenarios: ${esc((report.scenarios ?? []).join(', '))}</div>
  ${report.variants.map(variantSection).join('')}
</body>
</html>`
}

function isMultiVariantReport(value: unknown): value is MultiVariantReport {
  if (typeof value !== 'object' || value === null) return false
  if (!('variants' in value) || !Array.isArray(value.variants)) return false
  return true
}

function main(): void {
  if (!fs.existsSync(RESULTS)) {
    console.error(`No eval results found at ${RESULTS}. Run \`npm run eval\` first.`)
    process.exit(1)
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(RESULTS, 'utf8'))
  if (!isMultiVariantReport(parsed)) {
    console.error(`Invalid eval results shape at ${RESULTS}`)
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT_FILE, render(parsed), 'utf8')
  console.log(`Eval report written to ${OUT_FILE}`)
}

main()
