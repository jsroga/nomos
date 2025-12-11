/**
 * LangSmith Configuration Helper
 *
 * To enable LangSmith tracing, set these environment variables in .env.local:
 *
 * LANGCHAIN_TRACING_V2=true
 * LANGCHAIN_API_KEY=lsv2_pt_xxxxxxxxxxxxx  (get from smith.langchain.com -> Settings -> API Keys)
 * LANGCHAIN_PROJECT=tilemap-storyteller    (optional, defaults to "default")
 * LANGCHAIN_ENDPOINT=https://api.smith.langchain.com  (optional)
 */

export function checkLangSmithConfig(): { enabled: boolean; issues: string[] } {
  const issues: string[] = []

  const tracingEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true'
  const apiKey = process.env.LANGCHAIN_API_KEY
  const project = process.env.LANGCHAIN_PROJECT

  if (!tracingEnabled) {
    issues.push('LANGCHAIN_TRACING_V2 is not set to "true"')
  }

  if (!apiKey) {
    issues.push('LANGCHAIN_API_KEY is not set')
  } else if (!apiKey.startsWith('lsv2_pt_') && !apiKey.startsWith('ls__')) {
    issues.push('LANGCHAIN_API_KEY format looks wrong (should start with lsv2_pt_ or ls__)')
  }

  if (!project) {
    issues.push('LANGCHAIN_PROJECT not set (optional, will use "default")')
  }

  return {
    enabled: tracingEnabled && !!apiKey,
    issues,
  }
}

export function logLangSmithStatus(): void {
  const { enabled, issues } = checkLangSmithConfig()

  console.log('=== LangSmith Configuration ===')
  console.log('Tracing enabled:', enabled)
  console.log('Project:', process.env.LANGCHAIN_PROJECT || 'default')

  if (issues.length > 0) {
    console.log('Issues:')
    issues.forEach(issue => console.log('  -', issue))
  }
  console.log('==============================')
}






