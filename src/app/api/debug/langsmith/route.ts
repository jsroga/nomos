import { NextResponse } from 'next/server'
import { checkLangSmithConfig } from '@/lib/langsmith'
import { requireAuth } from '@/lib/api-utils'

/**
 * Debug endpoint to check LangSmith configuration
 * GET /api/debug/langsmith
 * 
 * PROTECTED - requires authentication
 */
export async function GET() {
  // Require auth - debug endpoints should not be public
  const { session, error } = await requireAuth()
  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = checkLangSmithConfig()

  // Test the connection if configured
  let connectionTest = null
  if (config.enabled && process.env.LANGCHAIN_API_KEY) {
    try {
      const response = await fetch('https://api.smith.langchain.com/info', {
        headers: {
          'x-api-key': process.env.LANGCHAIN_API_KEY,
        },
      })

      if (response.ok) {
        connectionTest = { status: 'connected', statusCode: response.status }
      } else {
        const text = await response.text()
        connectionTest = {
          status: 'failed',
          statusCode: response.status,
          error: text.slice(0, 200),
        }
      }
    } catch (error) {
      connectionTest = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  return NextResponse.json({
    langsmith: {
      enabled: config.enabled,
      issues: config.issues,
      project: process.env.LANGCHAIN_PROJECT || 'default',
      endpoint: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
      apiKeySet: !!process.env.LANGCHAIN_API_KEY,
    },
    connectionTest,
    instructions: !config.enabled
      ? [
          'Add to .env.local:',
          'LANGCHAIN_TRACING_V2=true',
          'LANGCHAIN_API_KEY=lsv2_pt_YOUR_KEY_HERE',
          'LANGCHAIN_PROJECT=tilemap-storyteller',
          '',
          'Get your API key from: https://smith.langchain.com -> Settings -> API Keys',
        ]
      : null,
  })
}
