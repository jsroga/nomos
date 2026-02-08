/**
 * TOON Encoder Wrapper (T1)
 *
 * Encodes structured story data as TOON for LLM context injection.
 * TOON is INPUT-only -- agents still return JSON.
 * Falls back to JSON.stringify if TOON encoding fails or is not installed.
 *
 * @see https://github.com/toon-format/toon
 */

let toonEncode: ((data: unknown) => string) | null = null

// Lazy-load TOON to avoid hard dependency
async function loadToonEncoder(): Promise<typeof toonEncode> {
    if (toonEncode) return toonEncode
    try {
        const toon = await import('@toon-format/toon')
        toonEncode = toon.encode
        return toonEncode
    } catch {
        // TOON not installed, fall back to JSON
        return null
    }
}

/**
 * Encode structured story data as TOON for LLM context injection.
 * Falls back to JSON.stringify if TOON encoding fails.
 */
export async function encodeForContext(data: unknown, label?: string): Promise<string> {
    const encode = await loadToonEncoder()
    try {
        if (encode) {
            const toon = encode(data)
            return label ? `## ${label}\n\`\`\`toon\n${toon}\n\`\`\`` : toon
        }
    } catch {
        // Fall through to JSON
    }
    const json = JSON.stringify(data, null, 2)
    return label ? `## ${label}\n\`\`\`json\n${json}\n\`\`\`` : json
}

/**
 * Encode an array of uniform objects (characters, beats, rules) as TOON.
 * This is where the biggest token savings are -- tabular arrays.
 */
export async function encodeArrayForContext(
    items: Record<string, unknown>[],
    label: string,
    fields?: string[]
): Promise<string> {
    const filtered = fields
        ? items.map(item => Object.fromEntries(
            fields.filter(f => item[f] !== undefined).map(f => [f, item[f]])
        ))
        : items
    return encodeForContext({ [label]: filtered }, undefined)
}

/**
 * Synchronous encode (uses JSON if TOON not loaded yet).
 * Use this in hot paths where async is not possible.
 */
export function encodeForContextSync(data: unknown, label?: string): string {
    try {
        if (toonEncode) {
            const toon = toonEncode(data)
            return label ? `## ${label}\n\`\`\`toon\n${toon}\n\`\`\`` : toon
        }
    } catch {
        // Fall through to JSON
    }
    const json = JSON.stringify(data, null, 2)
    return label ? `## ${label}\n\`\`\`json\n${json}\n\`\`\`` : json
}
