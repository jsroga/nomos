/**
 * Confident AI REST API Client
 *
 * TypeScript client for interacting with Confident AI's Evals API.
 * Docs: https://www.confident-ai.com/docs/api-reference/introduction
 */

// API URLs by region (detected from key prefix)
const API_BASE_URL_US = 'https://api.confident-ai.com/v1'
const API_BASE_URL_EU = 'https://eu.api.confident-ai.com/v1'

function getApiBaseUrl(apiKey: string): string {
  // EU keys start with "confident_eu_"
  if (apiKey.startsWith('confident_eu_')) {
    return API_BASE_URL_EU
  }
  return API_BASE_URL_US
}

export interface ConfidentAIConfig {
  apiKey: string
}

// ============================================
// API Types
// ============================================

export interface LLMTestCase {
  /** Unique name for matching test cases across test runs (for experiments) */
  name?: string
  input: string
  actualOutput: string
  expectedOutput?: string
  context?: string[]
  retrievalContext?: string[]
}

export interface ConversationalTestCase {
  turns: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  scenario?: string
  expectedOutcome?: string
}

export interface MetricSettings {
  metric: {
    name: string
  }
  threshold?: number
  strictMode?: boolean
  includeReason?: boolean
}

export interface CreateMetricCollectionRequest {
  name: string
  multiTurn: boolean
  metricSettings: MetricSettings[]
}

export interface CreateMetricRequest {
  name: string
  multiTurn: boolean
  criteria: string
  evaluationParams?: (
    | 'input'
    | 'actualOutput'
    | 'expectedOutput'
    | 'context'
    | 'retrievalContext'
  )[]
  evaluationSteps?: string
}

export interface EvaluateRequest {
  metricCollection: string
  llmTestCases?: LLMTestCase[]
  conversationalTestCases?: ConversationalTestCase[]
  hyperparameters?: Record<string, unknown>
  identifier?: string
}

export interface TestRunResponse {
  success: boolean
  data: {
    id: string
  }
  deprecated: boolean
}

export interface TestRunDetails {
  id: string
  projectId?: string
  name?: string
  status: string
  testCases: Array<{
    id: string
    input: string
    actualOutput: string
    metricData: Array<{
      name: string
      score: number
      reason?: string
      success: boolean
    }>
  }>
  summary?: {
    passRate: number
    avgScore: number
  }
}

// ============================================
// API Client
// ============================================

export class ConfidentAIClient {
  private apiKey: string
  private baseUrl: string

  constructor(config: ConfidentAIConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = getApiBaseUrl(config.apiKey)
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method,
      headers: {
        CONFIDENT_API_KEY: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Confident AI API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  // ============================================
  // Metrics
  // ============================================

  /**
   * Create a custom metric
   */
  async createMetric(
    metric: CreateMetricRequest
  ): Promise<{ success: boolean; data: { id: string } }> {
    return this.request('POST', '/metrics', metric)
  }

  /**
   * List all metrics in the project
   */
  async listMetrics(): Promise<{
    success: boolean
    data: { metrics: Array<{ id: string; name: string }> }
  }> {
    return this.request('GET', '/metrics')
  }

  // ============================================
  // Metric Collections
  // ============================================

  /**
   * Create a metric collection
   */
  async createMetricCollection(
    collection: CreateMetricCollectionRequest
  ): Promise<{ success: boolean; data: { id: string } }> {
    return this.request('POST', '/metric-collections', collection)
  }

  /**
   * List all metric collections
   */
  async listMetricCollections(): Promise<{
    success: boolean
    data: { collections: Array<{ id: string; name: string }> }
  }> {
    return this.request('GET', '/metric-collections')
  }

  // ============================================
  // Evaluation
  // ============================================

  /**
   * Run LLM evaluation
   */
  async evaluate(request: EvaluateRequest): Promise<TestRunResponse> {
    return this.request('POST', '/evaluate', request)
  }

  /**
   * Get test run details
   */
  async getTestRun(testRunId: string): Promise<{ success: boolean; data: TestRunDetails }> {
    return this.request('GET', `/test-runs/${testRunId}`)
  }

  /**
   * List test runs
   */
  async listTestRuns(options?: { limit?: number; offset?: number }): Promise<{
    success: boolean
    data: { testRuns: TestRunDetails[] }
  }> {
    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    const query = params.toString() ? `?${params}` : ''
    return this.request('GET', `/test-runs${query}`)
  }

  // ============================================
  // Datasets
  // ============================================

  /**
   * Push a dataset
   */
  async pushDataset(
    name: string,
    goldens: Array<{
      input: string
      expectedOutput?: string
      context?: string[]
    }>
  ): Promise<{ success: boolean; data: { id: string } }> {
    return this.request('POST', '/datasets', {
      alias: name,
      goldens,
    })
  }

  /**
   * Pull a dataset
   */
  async pullDataset(alias: string): Promise<{
    success: boolean
    data: {
      goldens: Array<{
        input: string
        expectedOutput?: string
        context?: string[]
      }>
    }
  }> {
    return this.request('GET', `/datasets?alias=${encodeURIComponent(alias)}`)
  }
}

// ============================================
// Singleton instance
// ============================================

let _client: ConfidentAIClient | null = null

export function getConfidentAIClient(): ConfidentAIClient {
  if (!_client) {
    // Accept both env var names for flexibility
    const apiKey = process.env.CONFIDENT_API_KEY || process.env.CONFIDENT_AI_API_KEY
    if (!apiKey) {
      throw new Error(
        'CONFIDENT_API_KEY environment variable is not set. Get your Project API Key from https://app.confident-ai.com'
      )
    }
    _client = new ConfidentAIClient({ apiKey })
  }
  return _client
}

/**
 * Get the URL to view a test run on Confident AI
 * URL format: https://app.confident-ai.com/project/{projectId}/test-runs/{testRunId}
 * Always uses app.confident-ai.com (no EU subdomain for dashboard)
 */
export function getTestRunUrl(testRunId: string, projectId?: string): string {
  const baseUrl = 'https://app.confident-ai.com'

  // Use provided projectId, env var, or omit
  const resolvedProjectId = projectId || process.env.CONFIDENT_AI_PROJECT_ID

  if (resolvedProjectId) {
    return `${baseUrl}/project/${resolvedProjectId}/test-runs/${testRunId}`
  }
  // Fallback to direct test-run URL (may redirect or show login)
  return `${baseUrl}/test-runs/${testRunId}`
}
