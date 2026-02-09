'use client'

import React, { useEffect, useState } from 'react'

interface LatestEvalData {
  id?: string
  timestamp?: string
  variants?: Array<{
    name: string
    config: Record<string, unknown>
    overallMetrics?: {
      magicScore: number
      consistency: number
      orchestration: number
    }
    scenarioMetrics?: Record<
      string,
      {
        magicScore: number
        consistency: number
        orchestration: number
      }
    >
    exampleLogs?: Array<{
      id: string
      scenario: string
      input: string
      output: string
      score: number
      reasoning?: Record<string, string>
    }>
  }>
  e2eVariants?: Array<any>
}

interface LangfuseStatus {
  configured: boolean
  baseUrl: string
  dashboardUrl: string | null
  message: string
  note?: string
  urls?: {
    traces: string
    tracesWithScores: string
    tracesStoryteller: string
    evals: string
    scores: string
    llmConnections: string
    datasets: string
  }
  setupInstructions?: Array<{
    step: number
    title: string
    description: string
    url?: string
    action: string
  }>
  evaluatorTemplates?: Array<{
    name: string
    description: string
    prompt: string
    filterSuggestion: string
  }>
}

import { useParams } from 'next/navigation'

export default function EvalsPage() {
  const params = useParams() as { projectId: string }
  const [latestData, setLatestData] = useState<LatestEvalData | null>(null)
  const [langfuseStatus, setLangfuseStatus] = useState<LangfuseStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVariant, setActiveVariant] = useState<string | null>(null)
  const [runningEval, setRunningEval] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch latest local results
        const [latestRes, langfuseRes] = await Promise.all([
          fetch('/api/evaluation/latest').catch(() => null),
          fetch('/api/evaluation/langfuse').catch(() => null),
        ])

        if (latestRes?.ok) {
          const data = await latestRes.json()
          setLatestData(data)
          if (data.variants?.length > 0) {
            setActiveVariant(data.variants[0].name)
          }
        }

        if (langfuseRes?.ok) {
          const status = await langfuseRes.json()
          setLangfuseStatus(status)
        }
      } catch (err) {
        setError('Failed to load evaluation data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const [selectedExperiment, setSelectedExperiment] = useState('storyteller')

  const experiments = [
    { id: 'storyteller', name: 'Storyteller', description: 'Standard storyteller evaluation' },
    {
      id: 'eq-bench',
      name: 'EQ-Bench',
      description: 'Emotional Intelligence (arxiv.org/html/2312.06281v2)',
    },
    { id: 'personas', name: 'Personas', description: 'Persona fidelity evaluation' },
  ]

  const handleRunEvaluation = async () => {
    try {
      setRunningEval(true)
      const response = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: params.projectId,
          experiment: selectedExperiment,
        }),
      })

      if (response.ok) {
        // Refresh the data
        const latestRes = await fetch('/api/evaluation/latest')
        if (latestRes.ok) {
          const data = await latestRes.json()
          setLatestData(data)
        }
      }
    } catch (err) {
      console.error('Failed to run evaluation:', err)
    } finally {
      setRunningEval(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentVariant = latestData?.variants?.find(v => v.name === activeVariant)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Evaluations Dashboard</h1>
        <div className="flex gap-2 items-center">
          {langfuseStatus?.dashboardUrl && (
            <a
              href={langfuseStatus.dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
            >
              Open Langfuse Dashboard →
            </a>
          )}
          <select
            value={selectedExperiment}
            onChange={e => setSelectedExperiment(e.target.value)}
            className="px-3 py-2 bg-muted border border-border rounded text-sm"
          >
            {experiments.map(exp => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleRunEvaluation}
            disabled={runningEval}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm transition-colors disabled:opacity-50"
          >
            {runningEval ? 'Running...' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {/* Langfuse Status */}
      <div
        className={`mb-6 p-4 rounded-lg border ${langfuseStatus?.configured ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${langfuseStatus?.configured ? 'bg-green-500' : 'bg-yellow-500'}`}
            ></span>
            <span className="text-sm font-medium">
              {langfuseStatus?.configured ? 'Langfuse Connected' : 'Langfuse Not Configured'}
            </span>
          </div>
          {langfuseStatus?.urls && (
            <div className="flex gap-2">
              <a
                href={langfuseStatus.urls.evals}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              >
                Evals Tab
              </a>
              <a
                href={langfuseStatus.urls.tracesWithScores}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Traces with Scores
              </a>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{langfuseStatus?.message}</p>
        {langfuseStatus?.note && (
          <p className="text-xs text-yellow-500/80 mt-1">{langfuseStatus.note}</p>
        )}
      </div>

      {/* Setup Instructions for Langfuse Evals */}
      {langfuseStatus?.configured && langfuseStatus.setupInstructions && (
        <div className="mb-6 p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
          <h3 className="text-sm font-semibold mb-3 text-purple-400">
            Setup Langfuse LLM-as-a-Judge (for Evals tab)
          </h3>
          <div className="space-y-3">
            {langfuseStatus.setupInstructions.map(instruction => (
              <div key={instruction.step} className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {instruction.step}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{instruction.title}</span>
                    {instruction.url && (
                      <a
                        href={instruction.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 underline"
                      >
                        Open →
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{instruction.description}</p>
                  <p className="text-xs text-purple-400/60 mt-0.5">{instruction.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Results */}
      {latestData?.variants && latestData.variants.length > 0 ? (
        <div className="space-y-6">
          {/* Timestamp */}
          {latestData.timestamp && (
            <p className="text-sm text-muted-foreground">
              Last run: {new Date(latestData.timestamp).toLocaleString()}
            </p>
          )}

          {/* Variant Tabs */}
          <div className="flex gap-2 border-b border-border pb-2">
            {latestData.variants.map(variant => (
              <button
                key={variant.name}
                onClick={() => setActiveVariant(variant.name)}
                className={`px-4 py-2 text-sm rounded-t transition-colors ${
                  activeVariant === variant.name
                    ? 'bg-primary/20 text-primary border-b-2 border-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {variant.name}
              </button>
            ))}
          </div>

          {/* Metrics Overview */}
          {currentVariant?.overallMetrics && (
            <div className="grid grid-cols-3 gap-4">
              <MetricCard
                label="Magic Score"
                value={currentVariant.overallMetrics.magicScore}
                color="purple"
              />
              <MetricCard
                label="Consistency"
                value={currentVariant.overallMetrics.consistency}
                color="blue"
              />
              <MetricCard
                label="Orchestration"
                value={currentVariant.overallMetrics.orchestration}
                color="green"
              />
            </div>
          )}

          {/* Scenario Breakdown */}
          {currentVariant?.scenarioMetrics &&
            Object.keys(currentVariant.scenarioMetrics).length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Scenario Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(currentVariant.scenarioMetrics).map(([scenario, metrics]) => (
                    <div key={scenario} className="bg-background/50 rounded p-3">
                      <div className="text-xs text-muted-foreground uppercase mb-1">{scenario}</div>
                      <div className="text-lg font-bold text-primary">
                        {(metrics.magicScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Magic Score</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Example Logs */}
          {currentVariant?.exampleLogs && currentVariant.exampleLogs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Example Logs ({currentVariant.exampleLogs.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentVariant.exampleLogs.map((log, i) => (
                  <details
                    key={log.id || i}
                    className="bg-muted/20 rounded border border-border group"
                  >
                    <summary className="p-3 cursor-pointer flex items-center justify-between hover:bg-muted/30">
                      <span className="text-sm">
                        <span className="text-muted-foreground">[{log.scenario}]</span>{' '}
                        {log.input.slice(0, 60)}...
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          log.score >= 0.7
                            ? 'bg-green-500/20 text-green-400'
                            : log.score >= 0.5
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {(log.score * 100).toFixed(0)}%
                      </span>
                    </summary>
                    <div className="p-3 border-t border-border space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Input:</div>
                        <div className="text-sm bg-background/50 p-2 rounded">{log.input}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Output:</div>
                        <div className="text-sm bg-background/50 p-2 rounded whitespace-pre-wrap">
                          {log.output?.slice(0, 500)}
                          {log.output?.length > 500 ? '...' : ''}
                        </div>
                      </div>
                      {log.reasoning && Object.keys(log.reasoning).length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground">Reasoning:</div>
                          <div className="text-xs bg-background/50 p-2 rounded space-y-1">
                            {Object.entries(log.reasoning).map(([key, val]) => (
                              <div key={key}>
                                <strong>{key}:</strong> {val}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <p className="text-muted-foreground mb-4">No evaluation results found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Run an evaluation to see results here or check the Langfuse dashboard for LLM-as-Judge
            traces.
          </p>
          <div className="space-y-2 text-sm text-left max-w-md mx-auto bg-background/50 p-4 rounded">
            <p className="font-medium">To run evaluations:</p>
            <code className="block bg-muted p-2 rounded text-xs">npm run eval storyteller</code>
            <p className="text-xs text-muted-foreground mt-2">
              Or use the "Run Evaluation" button above (requires the evaluation API to be set up).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses =
    {
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
    }[color] || 'bg-muted text-foreground'

  const percentage = typeof value === 'number' ? (value * 100).toFixed(0) : '0'

  return (
    <div className={`p-4 rounded-lg border ${colorClasses}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-3xl font-bold mt-1">{percentage}%</div>
      <div className="w-full bg-background/30 rounded-full h-2 mt-2">
        <div
          className="h-2 rounded-full bg-current"
          style={{ width: `${Math.min(100, parseFloat(percentage))}%` }}
        />
      </div>
    </div>
  )
}
