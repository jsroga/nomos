
import * as fs from 'fs'
import * as path from 'path'
import { MultiVariantReport, VariantReport } from '../types'

const VARIANTS = [
    { name: 'A (Baseline)', strategy: 'Standard' },
    { name: 'B (Show Dont Tell)', strategy: 'Style' },
    { name: 'C (Sensory)', strategy: 'Style' },
    { name: 'D (Hemingway)', strategy: 'Style' },
    { name: 'E (Lovecraft)', strategy: 'Style' },
    { name: 'F (In Media Res)', strategy: 'Structural' },
    { name: 'G (Deep POV)', strategy: 'Structural' },
    { name: 'H (Unreliable)', strategy: 'Conceptual' },
    { name: 'I (Stream of Consciousness)', strategy: 'Conceptual' },
    { name: 'J (The Architect)', strategy: 'Hybrid' },
]

const SCENARIOS = ['sci-fi', 'fantasy', 'thriller', 'edge']

function generateMockData() {
    const variants: VariantReport[] = VARIANTS.map(v => {
        const isWinner = v.name.includes('Architect')
        const baseScore = isWinner ? 0.85 : 0.4 + Math.random() * 0.3

        const scenarioMetrics: any = {}
        SCENARIOS.forEach(s => {
            scenarioMetrics[s] = {
                magicScore: Math.min(0.99, baseScore + (Math.random() * 0.1 - 0.05)),
                consistency: 0.8 + Math.random() * 0.2,
                orchestration: 0.9 + Math.random() * 0.1,
                latencyMs: 1000 + Math.random() * 2000
            }
        })

        const exampleLogs = SCENARIOS.map((s, i) => ({
            id: `${s}-0${i + 1}`,
            scenario: s,
            input: `Write a compelling scene about ${s} concepts...`,
            output: `[MOCK OUTPUT for ${v.name}] The atmosphere was thick with tension. (This is a simulated response to verify the Detail View UI functionality without API costs).`,
            score: scenarioMetrics[s].magicScore,
            reasoning: { "analysis": "Good usage of sensory details." }
        }))

        return {
            name: v.name,
            config: { strategy: v.strategy, model: 'claude-3-5-sonnet' },
            overallMetrics: {
                magicScore: baseScore,
                consistency: 0.85,
                orchestration: 0.95,
                latencyMs: 1500
            },
            scenarioMetrics,
            exampleLogs
        }
    })

    const report: MultiVariantReport = {
        id: `mock_${Date.now()}`,
        timestamp: new Date().toISOString(),
        variants,
        scenarios: SCENARIOS
    }

    const resultsDir = path.resolve(process.cwd(), 'src/evaluation/results')
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true })
    fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(report, null, 2))
    console.log('✅ Mock data generated in latest.json')
}

generateMockData()
