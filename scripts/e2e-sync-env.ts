import { readFileSync } from 'fs'
import { resolve } from 'path'

const MISSING_TOKEN_MESSAGE = 'VERCEL_TOKEN is required to sync env vars'
const MISSING_PROJECT_MESSAGE = 'VERCEL_PROJECT is required to sync env vars'
const ENV_FILE_PATH = '.env.local'
const TARGETS = ['preview']
const DOUBLE_QUOTE = '"'
const SINGLE_QUOTE = '\''
const ESCAPED_NEWLINE = '\n'

interface EnvVarPayload {
  key: string
  value: string
  type: 'plain'
  target: string[]
  gitBranch: null
}

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(name === 'VERCEL_TOKEN' ? MISSING_TOKEN_MESSAGE : MISSING_PROJECT_MESSAGE)
  return value
}

function parseEnvFile(path: string): Record<string, string> {
  const content = readFileSync(resolve(path), 'utf8')
  const vars: Record<string, string> = {}

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed
    const equalIndex = withoutExport.indexOf('=')
    if (equalIndex === -1) continue

    const key = withoutExport.slice(0, equalIndex).trim()
    let value = withoutExport.slice(equalIndex + 1).trim()

    if (value.startsWith(DOUBLE_QUOTE) && value.endsWith(DOUBLE_QUOTE)) {
      value = value.slice(1, -1).replace(/\\"/g, DOUBLE_QUOTE).replace(/\\n/g, ESCAPED_NEWLINE)
    } else if (value.startsWith(SINGLE_QUOTE) && value.endsWith(SINGLE_QUOTE)) {
      value = value.slice(1, -1).replace(/\\'/g, SINGLE_QUOTE).replace(/\\n/g, ESCAPED_NEWLINE)
    }

    if (key) vars[key] = value
  }

  return vars
}

interface VercelEnvVar {
  id: string
  key: string
}

function isVercelEnvVar(value: unknown): value is VercelEnvVar {
  if (typeof value !== 'object' || value === null) return false
  const id = Reflect.get(value, 'id')
  const key = Reflect.get(value, 'key')
  return typeof id === 'string' && typeof key === 'string'
}

function extractEnvVars(data: unknown): VercelEnvVar[] {
  if (typeof data !== 'object' || data === null) return []
  const envs = Reflect.get(data, 'envs')
  if (!Array.isArray(envs)) return []
  return envs.filter(isVercelEnvVar)
}

async function fetchExistingEnvVars(token: string, projectId: string): Promise<VercelEnvVar[]> {
  const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?target=preview`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to fetch existing env vars: ${response.status} ${body}`)
  }
  return extractEnvVars(await response.json())
}

async function deleteEnvVar(token: string, projectId: string, envId: string): Promise<void> {
  const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Failed to delete env var ${envId}: ${response.status} ${body}`)
  }
}

async function createEnvVars(token: string, projectId: string, entries: EnvVarPayload[]): Promise<void> {
  const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entries),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Vercel env sync failed: ${response.status} ${body}`)
  }
}

async function syncEnvVars(): Promise<void> {
  const token = getEnv('VERCEL_TOKEN')
  const projectId = getEnv('VERCEL_PROJECT')
  const vars = parseEnvFile(ENV_FILE_PATH)
  const keysToSync = Object.keys(vars).filter(key => key !== 'VERCEL_TOKEN' && key !== 'VERCEL_PROJECT')
  const entries = keysToSync.map<EnvVarPayload>(key => ({
    key,
    value: vars[key] ?? '',
    type: 'plain',
    target: TARGETS,
    gitBranch: null,
  }))

  const existing = await fetchExistingEnvVars(token, projectId)
  const existingIdsToDelete = existing
    .filter(env => keysToSync.includes(env.key))
    .map(env => env.id)

  for (const envId of existingIdsToDelete) {
    await deleteEnvVar(token, projectId, envId)
  }

  await createEnvVars(token, projectId, entries)

  console.log(`Synced ${entries.length} env vars to Vercel project ${projectId} (${TARGETS.join(', ')})`)
}

syncEnvVars().catch((error) => {
  console.error(error)
  process.exit(1)
})
