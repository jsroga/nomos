import * as fs from 'fs'
import * as path from 'path'

/**
 * Storyteller Report Generator
 *
 * Creates a beautiful, literary HTML dashboard for evaluation results.
 * Optimized for comparing parallel runs and inspecting high-fidelity intent.
 */

interface EvalRegression {
  message: string
}

interface EvalExampleResult {
  exampleId: string
  input: unknown
  output: string | { response?: string; metadata?: { isMeta?: boolean }; [key: string]: unknown }
  scores: Record<string, number>
  reasoning: Record<string, string>
}

interface EvalExperiment {
  name?: string
  id?: string
  timestamp?: Date | string
  results?: EvalExampleResult[]
  aggregatedScores?: Record<string, number>
  regressions?: EvalRegression[]
  duration?: number
}

interface EvalVariant {
  name: string
  aggregatedScores: Record<string, number>
  results: EvalExampleResult[]
}

interface ABTestReport {
  variantA: EvalVariant
  variantB: EvalVariant
  winner: string
  significance: number
}

interface PersonaExampleLog {
  scenario: string
  output: string
  score: number
  reasoning: string
}

interface PersonaVariant {
  name: string
  overallMetrics: {
    averageScore: number
    latencyMs: number
  }
  exampleLogs: PersonaExampleLog[]
}

interface PersonaReport {
  id: string
  timestamp: Date | string
  variants: PersonaVariant[]
}

export function generateHtmlReport(experiment: EvalExperiment): string {
  const {
    name = 'Experiment',
    id = 'N/A',
    timestamp = new Date(),
    results = [],
    aggregatedScores = {},
    regressions = [],
    duration = 0,
  } = experiment

  const scoreCards = Object.entries(aggregatedScores || {})
    .map(
      ([metric, score]) => `
      <div class="score-card">
        <div class="score-label">${metric.replace(/-/g, ' ').toUpperCase()}</div>
        <div class="score-value">${((score || 0) * 100).toFixed(1)}%</div>
        <div class="score-bar-bg">
          <div class="score-bar-fill" style="width: ${(score || 0) * 100}%"></div>
        </div>
      </div>
    `
    )
    .join('')

  const exampleRows = results
    .map(
      (res: EvalExampleResult, idx: number) => `
    <div class="example-box" data-example="${idx}">
      <div class="example-header" onclick="toggleExample(${idx})">
        <div class="example-title">
          <span class="expand-icon" id="icon-${idx}">▶</span>
          <span class="example-id">#${idx + 1} - ${res.exampleId}</span>
        </div>
        <div class="example-badges">
          ${Object.entries(res.scores || {})
            .map(
              ([m, s]) => `
            <span class="metric-pill">
              <span class="m-label">${m.replace(/-/g, ' ')}:</span>
              <span class="m-value">${(s * 100).toFixed(0)}</span>
            </span>
          `
            )
            .join('')}
        </div>
      </div>
      
      <div class="example-content" id="content-${idx}" style="display: none;">
        <div class="content-tabs">
          <button class="tab-btn active" onclick="showTab(${idx}, 'input')">Input</button>
          <button class="tab-btn" onclick="showTab(${idx}, 'output')">Output</button>
          <button class="tab-btn" onclick="showTab(${idx}, 'reasoning')">Reasoning</button>
        </div>
        
        <div class="tab-content" id="tab-input-${idx}">
          <div class="code-box">${JSON.stringify(res.input, null, 2)}</div>
        </div>
        
        <div class="tab-content" id="tab-output-${idx}" style="display: none;">
          <div class="literary-output">
            ${typeof res.output === 'string' ? res.output : res.output?.response || JSON.stringify(res.output, null, 2)}
          </div>
        </div>
        
        <div class="tab-content" id="tab-reasoning-${idx}" style="display: none;">
          ${Object.entries(res.reasoning)
            .map(
              ([evalName, reason]) => `
            <div class="reason-block">
              <div class="reason-header" onclick="toggleReason(this)">
                <span class="reason-icon">▶</span>
                <strong>${evalName}</strong>
              </div>
              <div class="reason-content" style="display: none;">${reason}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark 2.0: ${name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono&family=Syne:wght@800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #5c7cfa;
            --primary-glow: rgba(92, 124, 250, 0.4);
            --bg: #030303;
            --card-bg: #0d0d0d;
            --card-hover: #141414;
            --border: rgba(255, 255, 255, 0.08);
            --text: #ffffff;
            --text-dim: #888;
            --accent: #ff0055;
            --success: #00ff88;
        }

        body {
            background-color: var(--bg);
            color: var(--text);
            font-family: 'Outfit', sans-serif;
            margin: 0;
            padding: 2vw 5vw;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            max-width: 1400px;
            margin: 0 auto 80px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 20px;
        }

        h1 {
            font-family: 'Syne', sans-serif;
            font-size: clamp(2rem, 5vw, 4rem);
            margin: 0;
            line-height: 0.9;
            letter-spacing: -0.04em;
            background: linear-gradient(135deg, #fff 0%, #666 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .meta {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: var(--text-dim);
            text-align: right;
            border-left: 2px solid var(--primary);
            padding-left: 20px;
        }

        .dashboard {
            max-width: 1400px;
            margin: 0 auto 100px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
        }

        .score-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            padding: 32px;
            border-radius: 20px;
            transition: transform 0.3s ease, border-color 0.3s ease;
        }

        .score-card:hover {
            transform: translateY(-5px);
            border-color: var(--primary);
            background: var(--card-hover);
        }

        .score-label {
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: var(--primary);
            margin-bottom: 20px;
        }

        .score-value {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 20px;
            font-variant-numeric: tabular-nums;
        }

        .score-bar-bg {
            height: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .score-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), #8e2de2);
            border-radius: 3px;
            box-shadow: 0 0 15px var(--primary-glow);
        }

        .example-box {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 24px;
            margin-bottom: 60px;
            padding: 40px;
        }

        .example-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 30px;
            flex-wrap: wrap;
            gap: 20px;
        }

        .example-id {
            font-family: 'Syne', sans-serif;
            font-size: 1.8rem;
            letter-spacing: -0.02em;
        }

        .badge {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            padding: 6px 14px;
            border-radius: 100px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            margin-left: 10px;
        }

        .badge.high { background: rgba(0, 255, 136, 0.1); color: var(--success); border-color: var(--success); }
        .badge.low { background: rgba(255, 0, 85, 0.1); color: var(--accent); border-color: var(--accent); }
        .badge.intent { background: rgba(92, 124, 250, 0.1); color: var(--primary); border-color: var(--primary); }

        .content-section {
            margin-bottom: 40px;
        }

        h3 {
            font-size: 0.65rem;
            font-weight: 800;
            letter-spacing: 0.2em;
            color: var(--text-dim);
            margin-bottom: 15px;
            text-transform: uppercase;
        }

        pre {
            background: rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.03);
            border-radius: 16px;
            padding: 24px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
            color: #aaa;
        }

        .literary-output {
            font-family: 'Outfit', sans-serif;
            font-size: 1.1rem;
            line-height: 1.7;
            font-weight: 300;
            color: #eee;
            white-space: pre-wrap;
            padding: 24px;
            border-left: 4px solid var(--primary);
            background: rgba(0,0,0,0.3);
            border-radius: 0 16px 16px 0;
        }

        .reason-block {
            font-size: 0.75rem;
            color: var(--accent);
            opacity: 0.8;
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
        }

        .regressions {
            background: rgba(255, 0, 85, 0.05);
            border: 1px solid var(--accent);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 40px;
        }

        .regression-item {
            color: var(--accent);
            font-weight: bold;
            margin-bottom: 5px;
        }

        .results-list {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Interactive Elements */
        .example-header {
            cursor: pointer;
            transition: background 0.2s ease;
        }
        
        .example-header:hover {
            background: var(--card-hover);
        }

        .example-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .expand-icon {
            font-size: 0.8rem;
            transition: transform 0.3s ease;
            color: var(--primary);
        }

        .expand-icon.expanded {
            transform: rotate(90deg);
        }

        .metric-pill {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            padding: 4px 10px;
            border-radius: 100px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.65rem;
            display: inline-flex;
            gap: 6px;
            margin-left: 8px;
        }

        .m-label { color: var(--text-dim); text-transform: uppercase; }
        .m-value { color: var(--primary); font-weight: 800; }

        .content-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 16px;
        }

        .tab-btn {
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-dim);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            transition: all 0.2s ease;
        }

        .tab-btn:hover {
            border-color: var(--primary);
            color: var(--text);
        }

        .tab-btn.active {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        .tab-content {
            animation: fadeIn 0.3s ease;
        }

        .code-box {
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            white-space: pre-wrap;
            overflow-x: auto;
            color: #aaa;
            max-height: 300px;
            overflow-y: auto;
        }

        .reason-header {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            border-radius: 8px;
            transition: background 0.2s ease;
        }

        .reason-header:hover {
            background: rgba(255,255,255,0.03);
        }

        .reason-icon {
            font-size: 0.7rem;
            transition: transform 0.3s ease;
            color: var(--accent);
        }

        .reason-icon.expanded {
            transform: rotate(90deg);
        }

        .reason-content {
            padding: 12px 12px 12px 28px;
            font-size: 0.8rem;
            color: #ccc;
            line-height: 1.6;
            animation: fadeIn 0.3s ease;
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .example-box {
            animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .example-box:nth-child(1) { animation-delay: 0.05s; }
        .example-box:nth-child(2) { animation-delay: 0.1s; }
        .example-box:nth-child(3) { animation-delay: 0.15s; }
    </style>
    <script>
        function toggleExample(idx) {
            const content = document.getElementById('content-' + idx);
            const icon = document.getElementById('icon-' + idx);
            const isHidden = content.style.display === 'none';
            
            content.style.display = isHidden ? 'block' : 'none';
            icon.classList.toggle('expanded', isHidden);
        }

        function showTab(idx, tabName) {
            // Hide all tabs for this example
            ['input', 'output', 'reasoning'].forEach(t => {
                const el = document.getElementById('tab-' + t + '-' + idx);
                if (el) el.style.display = 'none';
            });
            
            // Show selected tab
            const selected = document.getElementById('tab-' + tabName + '-' + idx);
            if (selected) selected.style.display = 'block';
            
            // Update button states
            const buttons = document.querySelectorAll('[data-example="' + idx + '"] .tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
        }

        function toggleReason(header) {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.reason-icon');
            const isHidden = content.style.display === 'none';
            
            content.style.display = isHidden ? 'block' : 'none';
            icon.classList.toggle('expanded', isHidden);
        }

        // Expand all on double-click header
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.score-card').forEach(card => {
                card.addEventListener('click', () => {
                    card.classList.toggle('pulse');
                    setTimeout(() => card.classList.remove('pulse'), 300);
                });
            });
        });
    </script>
</head>
<body>
    <div class="container">
        <header>
            <h1>Storyteller Benchmark 2.0</h1>
            <div class="meta">
                Experiment ID: ${id} | Run on: ${new Date(timestamp).toLocaleString()} | Duration: ${(duration / 1000).toFixed(1)}s
            </div>
        </header>

        ${
          regressions.length > 0
            ? `
            <div class="regressions">
                <h3>⚠️ Regressions & Warnings</h3>
                ${regressions.map((r: EvalRegression) => `<div class="regression-item">${r.message}</div>`).join('')}
            </div>
        `
            : ''
        }

        <div class="dashboard">
            ${scoreCards}
        </div>

        <div class="results-list">
            ${exampleRows}
        </div>
    </div>
</body>
</html>
  `
}

export function saveHtmlReport(experiment: EvalExperiment & { id: string }) {
  const html = generateHtmlReport(experiment)
  const reportDir = path.resolve(process.cwd(), 'src/evaluation/reports')
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }

  const filePath = path.join(reportDir, `${experiment.id}.html`)
  fs.writeFileSync(filePath, html)

  const latestPath = path.join(reportDir, 'latest.html')
  fs.writeFileSync(latestPath, html)

  console.log('   🎨 HTML Report generated: src/evaluation/reports/latest.html')
}

export function saveABTestReport(abTest: ABTestReport) {
  const { variantA, variantB, winner, significance } = abTest
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Benchmark 2.0 | Dual-Layer Analysis</title>
    <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #fdfaf6;
            --text: #2c241e;
            --accent: #8b2635; /* Creative Layer Color */
            --sys: #2c5877; /* System Layer Color */
            --border: #dcd0c0;
            --gold: #c5a059;
            --font-serif: 'Crimson Pro', serif;
            --font-sans: 'Inter', sans-serif;
        }
        body { background: var(--bg); color: var(--text); font-family: var(--font-sans); margin: 0; padding: 60px 40px; line-height: 1.7; }
        .container { max-width: 1400px; margin: 0 auto; }
        
        header { border-bottom: 3px double var(--text); padding-bottom: 30px; margin-bottom: 60px; text-align: center; }
        h1 { font-family: var(--font-serif); font-size: 3.5rem; text-transform: uppercase; letter-spacing: 0.2em; margin: 0; }
        .subtitle { font-family: var(--font-serif); font-style: italic; color: #7a6e60; font-size: 1.2rem; }

        .winner-panel { 
            background: #fff; border: 1px solid var(--border); 
            box-shadow: 15px 15px 0px var(--border);
            padding: 40px; margin-bottom: 80px; text-align: center;
        }
        .winner-title { font-family: var(--font-serif); font-size: 2rem; color: var(--accent); margin-bottom: 10px; }
        .significance { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gold); }

        /* DUAL LAYER VISUALIZATION */
        .layer-legend { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.8rem; }
        .layer-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 5px; }
        .layer-sys { background: var(--sys); }
        .layer-art { background: var(--accent); }

        .comparison-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 100px; }
        .variant-column { position: relative; }
        .variant-column::after { content: ''; position: absolute; right: -30px; top: 0; bottom: 0; width: 1px; background: var(--border); }
        .variant-column:last-child::after { display: none; }

        .variant-header { font-family: var(--font-serif); font-size: 2rem; border-bottom: 1px solid var(--text); padding-bottom: 15px; margin-bottom: 30px; }
        .agg-scores { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .score-item { background: #fff; border: 1px solid var(--border); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
        
        .score-item.sys { border-left: 5px solid var(--sys); }
        .score-item.art { border-left: 5px solid var(--accent); }

        .score-val { font-family: var(--font-serif); font-size: 1.5rem; font-weight: bold; }
        .score-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }

        .example-header { font-family: var(--font-serif); font-size: 1.8rem; margin: 80px 0 40px; border-bottom: 1px solid var(--border); padding-bottom: 10px; display: flex; justify-content: space-between; }
        .ab-row { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 80px; }
        
        .example-card { background: #fff; padding: 30px; border: 1px solid var(--border); min-height: 400px; display: flex; flex-direction: column; position: relative; }
        .card-type { position: absolute; top: -10px; right: 20px; background: #fff; padding: 0 10px; font-size: 0.7rem; text-transform: uppercase; border: 1px solid var(--border); color: #888; letter-spacing: 0.1em; }
        
        .literary-box { font-family: var(--font-serif); font-size: 1.1rem; white-space: pre-wrap; margin-bottom: 20px; flex-grow: 1; position: relative; padding: 20px; background: #fffdf9; border: 1px inset var(--border); }
        .literary-box.meta { font-family: var(--font-sans); font-size: 0.95rem; background: #f0f4f8; border-color: #dbe4ea; color: #334e68; }

        .eval-notes { border-top: 1px solid var(--border); padding-top: 20px; font-size: 0.9rem; }
        .badge-list { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
        .badge { padding: 4px 10px; font-size: 0.7rem; text-transform: uppercase; border: 1px solid #ccc;  }
        
        .badge.sys { border-color: var(--sys); color: var(--sys); background: #f0f7ff; }
        .badge.art { border-color: var(--accent); color: var(--accent); background: #fff5f5; }


        h4 { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em; color: #aaa; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Storyteller Benchmark 2.0</h1>
            <div class="subtitle">Dual-Layer Evaluation: Orchestration (System) & Creative (Art)</div>
            <p>Conducted: ${new Date().toLocaleString()}</p>
        </header>

        <div class="layer-legend">
            <span><span class="layer-dot layer-sys"></span>System Layer (Orchestration)</span>
            <span><span class="layer-dot layer-art"></span>Creative Layer (Writing)</span>
        </div>

        <section class="winner-panel">
            <div class="significance">${(significance * 100).toFixed(1)}% SIGNIFICANCE</div>
            <div class="winner-title">Recommended Variant: ${winner.toUpperCase()}</div>
        </section>

        <div class="comparison-grid">
            <div class="variant-column">
                <div class="variant-header">${variantA.name}</div>
                <div class="agg-scores">
                    ${Object.entries(variantA.aggregatedScores)
                      .map(
                        ([m, s]) => `
                        <div class="score-item ${m.includes('magic') || m.includes('intent') ? 'art' : 'sys'}">
                            <span class="score-label">${m.replace(/-/g, ' ')}</span>
                            <span class="score-val">${(s * 100).toFixed(0)}%</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
            <div class="variant-column">
                <div class="variant-header">${variantB.name}</div>
                <div class="agg-scores">
                    ${Object.entries(variantB.aggregatedScores)
                      .map(
                        ([m, s]) => `
                        <div class="score-item ${m.includes('magic') || m.includes('intent') ? 'art' : 'sys'}">
                            <span class="score-label">${m.replace(/-/g, ' ')}</span>
                            <span class="score-val">${(s * 100).toFixed(0)}%</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        </div>

        ${variantA.results
          .map((resA: EvalExampleResult, i: number) => {
            const resB: EvalExampleResult = variantB.results[i] || { exampleId: '', input: null, output: 'N/A', scores: {}, reasoning: {} }
            const isMeta =
              (resA.output && typeof resA.output === 'object' && resA.output.metadata?.isMeta) ||
              (resB.output && typeof resB.output === 'object' && resB.output.metadata?.isMeta)

            const outputA =
              typeof resA.output === 'string'
                ? resA.output
                : resA.output?.response || JSON.stringify(resA.output)
            const outputB =
              typeof resB.output === 'string'
                ? resB.output
                : resB.output?.response || JSON.stringify(resB.output)

            return `
            <div class="example-header">
                <span>Case: ${resA.exampleId}</span>
                <span style="font-size: 0.9rem; color: #888;">${isMeta ? 'SYSTEM REQUEST' : 'CREATIVE TASK'}</span>
            </div>
            <div class="ab-row">
                <div class="example-card">
                    <h4>Standard Generation</h4>
                    <div class="card-type">${isMeta ? 'Logic' : 'Prose'}</div>
                    <div class="literary-box ${isMeta ? 'meta' : ''}">${outputA}</div>
                    <div class="eval-notes">
                        <div class="badge-list">
                             ${resA.scores['orchestration'] !== undefined ? `<span class="badge sys">Orchestration: ${(resA.scores['orchestration'] * 100).toFixed(0)}%</span>` : ''}
                            ${!isMeta && resA.scores['magic-score'] !== undefined ? `<span class="badge art">Magic: ${(resA.scores['magic-score'] * 100).toFixed(0)}%</span>` : ''}
                        </div>
                         <div style="margin-top:10px; font-size: 0.8rem; font-style:italic;">"${resA.reasoning['orchestration'] || resA.reasoning['magic-score'] || ''}"</div>
                    </div>
                </div>
                <div class="example-card">
                    <h4>Pro (Critique & Revise)</h4>
                    <div class="card-type">${isMeta ? 'Logic' : 'Prose'}</div>
                    <div class="literary-box ${isMeta ? 'meta' : ''}">${outputB}</div>
                    <div class="eval-notes">
                        <div class="badge-list">
                            ${resB.scores['orchestration'] !== undefined ? `<span class="badge sys">Orchestration: ${(resB.scores['orchestration'] * 100).toFixed(0)}%</span>` : ''}
                            ${!isMeta && resB.scores['magic-score'] !== undefined ? `<span class="badge art">Magic: ${(resB.scores['magic-score'] * 100).toFixed(0)}%</span>` : ''}
                        </div>
                         <div style="margin-top:10px; font-size: 0.8rem; font-style:italic;">"${resB.reasoning['orchestration'] || resB.reasoning['magic-score'] || ''}"</div>
                    </div>
                </div>
            </div>
            `
          })
          .join('')}
    </div>
</body>
</html>
    `
  const reportDir = path.resolve(process.cwd(), 'src/evaluation/reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })
  const filePath = path.join(reportDir, 'ab-test-latest.html')
  fs.writeFileSync(filePath, html)
  console.log('   📊 A/B Test comparison generated: src/evaluation/reports/ab-test-latest.html')
}

export function generatePersonaReport(report: PersonaReport): string {
  const { id, timestamp, variants } = report

  const variantCards = variants
    .map(
      (v: PersonaVariant) => `
        <div class="score-card persona-card">
            <div class="score-label">${v.name.toUpperCase()}</div>
            <div class="score-value">${(v.overallMetrics.averageScore * 100).toFixed(1)}%</div>
            <div class="meta-info">Lat: ${v.overallMetrics.latencyMs.toFixed(0)}ms</div>
            <div class="score-bar-bg">
                <div class="score-bar-fill" style="width: ${v.overallMetrics.averageScore * 100}%"></div>
            </div>
        </div>
    `
    )
    .join('')

  const exampleSections = variants[0].exampleLogs
    .map((_: PersonaExampleLog, i: number) => {
      return `
        <div class="example-header">Case: ${variants[0].exampleLogs[i].scenario}</div>
        <div class="comparison-grid" style="grid-template-columns: repeat(${variants.length}, 1fr);">
            ${variants
              .map((v: PersonaVariant) => {
                const log = v.exampleLogs[i]
                return `
                <div class="example-card">
                    <h4>${v.name}</h4>
                    <div class="literary-box">${log.output}</div>
                    <div class="eval-notes">
                        <div class="score-val" style="font-size: 1.2rem; color: var(--primary);">${(log.score * 100).toFixed(0)}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 5px;">${log.reasoning}</div>
                    </div>
                </div>
                `
              })
              .join('')}
        </div>
        `
    })
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Persona Benchmark | ${id}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono&family=Syne:wght@800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #5c7cfa;
            --bg: #030303;
            --card-bg: #0d0d0d;
            --border: rgba(255, 255, 255, 0.08);
            --text: #ffffff;
            --text-dim: #888;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; padding: 40px; }
        .container { max-width: 1600px; margin: 0 auto; }
        header { border-bottom: 2px solid var(--primary); padding-bottom: 20px; margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
        h1 { font-family: 'Syne', sans-serif; font-size: 3rem; margin: 0; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 60px; }
        .score-card { background: var(--card-bg); border: 1px solid var(--border); padding: 30px; border-radius: 20px; }
        .score-label { color: var(--primary); font-size: 0.8rem; font-weight: 800; letter-spacing: 0.1em; margin-bottom: 10px; }
        .score-value { font-size: 3rem; font-weight: 800; }
        .score-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-top: 15px; }
        .score-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }
        .meta-info { font-size: 0.8rem; color: var(--text-dim); font-family: 'JetBrains Mono', monospace; }
        .example-header { font-family: 'Syne', sans-serif; font-size: 1.5rem; margin-top: 60px; margin-bottom: 20px; color: var(--primary); border-left: 4px solid var(--primary); padding-left: 15px; }
        .comparison-grid { display: grid; gap: 20px; }
        .example-card { background: var(--card-bg); border: 1px solid var(--border); padding: 25px; border-radius: 15px; display: flex; flex-direction: column; }
        .literary-box { font-size: 1rem; line-height: 1.6; white-space: pre-wrap; margin: 15px 0; flex-grow: 1; color: #ccc; }
        .eval-notes { border-top: 1px solid var(--border); padding-top: 15px; }
        h4 { margin: 0; font-family: 'Syne', sans-serif; font-size: 1.1rem; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Persona Benchmark</h1>
            <div class="meta-info">Report ID: ${id} | ${new Date(timestamp).toLocaleString()}</div>
        </header>

        <div class="dashboard">
            ${variantCards}
        </div>

        ${exampleSections}
    </div>
</body>
</html>
    `
}

export async function savePersonaReport(report: PersonaReport) {
  const html = generatePersonaReport(report)
  const reportDir = path.resolve(process.cwd(), 'src/evaluation/reports')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })

  const filePath = path.join(reportDir, 'persona-eval-latest.html')
  fs.writeFileSync(filePath, html)

  // Also save specific ID version
  const idPath = path.join(reportDir, `${report.id}.html`)
  fs.writeFileSync(idPath, html)

  console.log(
    '\n🎨 Persona Comparative Report generated: src/evaluation/reports/persona-eval-latest.html'
  )
  return filePath
}
