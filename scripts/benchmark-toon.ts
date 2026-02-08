#!/usr/bin/env npx tsx
/**
 * TOON Benchmark Script (T4)
 *
 * Measures actual token savings of TOON encoding on real project data.
 * Compares current text format, JSON, and TOON for characters, beats,
 * world rules, and factions.
 *
 * Usage: npx tsx scripts/benchmark-toon.ts
 *
 * If savings < 15%, TOON adoption may not be worth the complexity.
 */

// Simple token estimation (4 chars/token for GPT-4o tokenizer approximation)
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
}

// Sample data representing typical project content
const SAMPLE_CHARACTERS = [
    { name: 'King Aldric', role: 'protagonist', description: 'A paranoid ruler who trusts no one after surviving an assassination attempt. Cold blue eyes, always wears his ancestral ring.', goals: ['Maintain order', 'Secure the dynasty'], fears: ['Betrayal', 'Losing control'], factionId: 'faction-crown' },
    { name: 'Lord Theron', role: 'antagonist', description: 'The Hand of the King, secretly funding the rebellion. A former soldier who saw too much poverty in the provinces.', goals: ['Free the common folk', 'Reform taxation'], fears: ['Becoming what he fights'], factionId: 'faction-reform' },
    { name: 'Sera', role: 'deuteragonist', description: 'Royal spymaster with divided loyalties. Saved the King during the assassination but may have orchestrated it.', goals: ['Survive', 'Protect her agents'], fears: ['Being discovered', 'Choosing wrong'], factionId: 'faction-shadow' },
    { name: 'Commander Voss', role: 'supporting', description: 'Loyal military commander, aging but sharp. Treats soldiers like family, drinks too much wine.', goals: ['Protect the realm', 'Retire honorably'], fears: ['Civil war', 'Outliving his soldiers'], factionId: 'faction-crown' },
    { name: 'Lyra', role: 'supporting', description: 'Young rebel leader from the mining towns. Lost her family to a cave-in the crown ignored. Speaks with the accent of the deep mines.', goals: ['Justice for miners', 'Overthrow the crown'], fears: ['Becoming a tyrant', 'Trusting again'], factionId: 'faction-reform' },
]

const SAMPLE_BEATS = [
    { id: 'b1', sequence: 1, logline: 'King Aldric receives an anonymous letter revealing financial discrepancies in the crown treasury', beatType: 'setup', status: 'approved' },
    { id: 'b2', sequence: 2, logline: 'Lord Theron deflects suspicion during a tense council meeting, blaming provincial governors', beatType: 'complication', status: 'approved' },
    { id: 'b3', sequence: 3, logline: 'Sera discovers the money trail leads to someone inside the palace, narrowing suspects to three', beatType: 'revelation', status: 'approved' },
    { id: 'b4', sequence: 4, logline: 'Aldric must decide whether to confront Theron publicly or gather more evidence in secret', beatType: 'decision', status: 'proposed' },
    { id: 'b5', sequence: 5, logline: 'The confrontation: Aldric reveals the ledger, Theron defends his actions with passionate logic', beatType: 'consequence', status: 'proposed' },
]

const SAMPLE_RULES = [
    { category: 'Magic', rule: 'Magic is powered by human memory. Every spell erases a memory from the caster.', consequence: 'Powerful mages lose their identity over time. Memory becomes the most valuable currency.' },
    { category: 'Society', rule: 'The ruling class hoards illiterate peasants as "fuel" for their mages.', consequence: 'Literacy is punishable by death for commoners. Underground schools exist in mining towns.' },
    { category: 'Politics', rule: 'The Crown Council requires unanimous consent for declaring war.', consequence: 'A single dissenter can block military action, creating political deadlocks and backroom deals.' },
    { category: 'Economics', rule: 'Memory crystals can store and trade memories, creating a black market.', consequence: 'Crime lords trade in stolen memories. Some memories are worth more than gold.' },
]

const SAMPLE_FACTIONS = [
    { name: 'The Crown', description: 'The royal family and their loyalists. Control the military and the treasury.', ideology: 'Divine right of kings', goals: ['Maintain power', 'Expand territory'], resources: 'Military, treasury, palace mages', weaknesses: 'Internal corruption, aging king', rivals: ['The Reform Council'] },
    { name: 'The Reform Council', description: 'Noble houses seeking parliamentary power. Some genuinely reformist, others just power-hungry.', ideology: 'Shared governance', goals: ['Reduce royal authority', 'Provincial representation'], resources: 'Provincial armies, popular support', weaknesses: 'Internal divisions, no unified leader', rivals: ['The Crown'] },
    { name: 'The Shadow Network', description: 'Spy organization answering to the Spymaster. Officially royal but increasingly autonomous.', ideology: 'Information is power', goals: ['Control intelligence', 'Maintain balance'], resources: 'Agents, blackmail files, memory crystals', weaknesses: 'Divided loyalty, reliance on one leader', rivals: [] },
]

// === ENCODING FORMATS ===

// Current format (text concatenation)
function encodeAsText(label: string, items: any[]): string {
    return `## ${label}\n` + items.map((item, i) => {
        return Object.entries(item)
            .map(([key, val]) => `  ${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n')
    }).join('\n---\n')
}

// JSON format
function encodeAsJSON(items: any[]): string {
    return JSON.stringify(items, null, 2)
}

// TOON-like format (simulated since we may not have the package)
function encodeAsTOON(label: string, items: any[]): string {
    if (items.length === 0) return `${label}[0]{}: `

    const fields = Object.keys(items[0])
    const header = `${label}[${items.length}]{${fields.join(',')}}:`

    const rows = items.map(item => {
        return fields.map(f => {
            const val = item[f]
            if (val === null || val === undefined) return ''
            if (Array.isArray(val)) return `"${JSON.stringify(val)}"`
            const str = String(val)
            // Quote if contains comma, newline, or quote
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }).join(',')
    }).join('\n  ')

    return `${header}\n  ${rows}`
}

// === BENCHMARK ===

console.log('='.repeat(70))
console.log('TOON BENCHMARK: Token savings on real project data')
console.log('='.repeat(70))
console.log()

const datasets = [
    { name: 'Characters', data: SAMPLE_CHARACTERS },
    { name: 'Beats', data: SAMPLE_BEATS },
    { name: 'World Rules', data: SAMPLE_RULES },
    { name: 'Factions', data: SAMPLE_FACTIONS },
]

let totalText = 0
let totalJSON = 0
let totalTOON = 0

for (const { name, data } of datasets) {
    const textEncoded = encodeAsText(name, data)
    const jsonEncoded = encodeAsJSON(data)
    const toonEncoded = encodeAsTOON(name.toLowerCase(), data)

    const textTokens = estimateTokens(textEncoded)
    const jsonTokens = estimateTokens(jsonEncoded)
    const toonTokens = estimateTokens(toonEncoded)

    totalText += textTokens
    totalJSON += jsonTokens
    totalTOON += toonTokens

    const savingsVsText = ((textTokens - toonTokens) / textTokens * 100).toFixed(1)
    const savingsVsJSON = ((jsonTokens - toonTokens) / jsonTokens * 100).toFixed(1)

    console.log(`${name}:`)
    console.log(`  Text format: ${textTokens} tokens`)
    console.log(`  JSON format: ${jsonTokens} tokens`)
    console.log(`  TOON format: ${toonTokens} tokens`)
    console.log(`  Savings vs Text: ${savingsVsText}%`)
    console.log(`  Savings vs JSON: ${savingsVsJSON}%`)
    console.log()
}

console.log('-'.repeat(70))
console.log(`TOTAL:`)
console.log(`  Text: ${totalText} tokens`)
console.log(`  JSON: ${totalJSON} tokens`)
console.log(`  TOON: ${totalTOON} tokens`)
console.log(`  Savings vs Text: ${((totalText - totalTOON) / totalText * 100).toFixed(1)}%`)
console.log(`  Savings vs JSON: ${((totalJSON - totalTOON) / totalJSON * 100).toFixed(1)}%`)
console.log()

const verdict = ((totalJSON - totalTOON) / totalJSON * 100) >= 15
    ? 'ADOPT TOON - savings exceed 15% threshold'
    : 'SKIP TOON - savings below 15% threshold, keep current format'

console.log(`VERDICT: ${verdict}`)
console.log('='.repeat(70))
