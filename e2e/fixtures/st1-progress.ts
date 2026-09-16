import type { Page, Request, Response } from '@playwright/test'
import { PROVIDER_PRICING } from '@/shared/ai/gateway/constants/pricing'
import {
  E2eOpenRouterGateway,
  E2ePinnedChatModel,
} from '@/shared/ai/gateway/constants/e2e-llm-pin'
import { FlowHttp, FlowSse } from '../constants/storyteller-flow'
import { SmokeHttpStatus, SmokeMatch } from '../constants/storyteller-smoke'

export enum St1Step {
  World = '1/6 world',
  NoMagic = '2/6 No Magic',
  Episode = '3/6 episode',
  Vex = '4/6 create Vex via chat',
  ReloadCast = '5/6 reload CAST',
  Fix = '6/6 Fix inconsistencies',
}

enum ProgressCopy {
  Banner = 'pre-push  critical e2e  ST-1 + canvas',
  CanvasWait = 'canvas  waiting for ST-1',
  Model = '  model     ',
  Turn = '  turn      in ',
  Session = '  session   in ',
  Tool = '  tool      ',
  Stream = '  stream    ',
  Prompt = '  prompt    ',
  Out = '  out ',
  Usd = '   $',
  Insufficient = 'OpenRouter 402 insufficient credits',
  InFlight = 'OpenRouter 402 in-flight budget',
}

enum SpendPath {
  Assistant = '/api/assistant/',
  FixRun = '/api/storyteller/consistency/fix-run',
}

enum SseField {
  Type = 'type',
  ToolName = 'toolName',
  Name = 'name',
  Delta = 'delta',
  Text = 'text',
  Usage = 'usage',
  Model = 'model',
  ModelName = 'modelName',
  Payload = 'payload',
  Messages = 'messages',
  Content = 'content',
  PromptTokens = 'promptTokens',
  CompletionTokens = 'completionTokens',
  InputTokens = 'inputTokens',
  OutputTokens = 'outputTokens',
}

enum ChunkType {
  ToolCall = 'tool-call',
  ToolInput = 'tool-input-start',
  TextDelta = 'text-delta',
  Text = 'text',
  Tool = 'tool',
}

const STREAM_PREVIEW = 80
const TOKENS_PER_MILLION = 1_000_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function isSpendUrl(url: string): boolean {
  return url.includes(SpendPath.Assistant) || url.includes(SpendPath.FixRun)
}

function openRouterModelId(model: string): string {
  if (model === E2ePinnedChatModel.CatalogId || model === E2ePinnedChatModel.GatewayId) {
    return E2ePinnedChatModel.OpenRouterId
  }
  if (model.startsWith(E2eOpenRouterGateway.Prefix)) {
    return model.slice(E2eOpenRouterGateway.Prefix.length)
  }
  return model
}

function costUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = PROVIDER_PRICING[openRouterModelId(model)]
  if (!price) return 0
  return (
    (promptTokens / TOKENS_PER_MILLION) * price.inputPerMillion +
    (completionTokens / TOKENS_PER_MILLION) * price.outputPerMillion
  )
}

function formatUsd(value: number): string {
  return `${ProgressCopy.Usd}${value.toFixed(3)}`
}

function parseSseObjects(body: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (const line of body.split('\n')) {
    if (!line.startsWith(FlowSse.DataPrefix)) continue
    try {
      const parsed: unknown = JSON.parse(line.slice(FlowSse.DataPrefix.length))
      if (isRecord(parsed)) rows.push(parsed)
    } catch {
      /* skip malformed SSE */
    }
  }
  return rows
}

function usageOf(frame: Record<string, unknown>): { prompt: number; completion: number } {
  const payload = isRecord(frame[SseField.Payload]) ? frame[SseField.Payload] : frame
  const usage = isRecord(payload[SseField.Usage])
    ? payload[SseField.Usage]
    : isRecord(frame[SseField.Usage])
      ? frame[SseField.Usage]
      : undefined
  if (!usage) return { prompt: 0, completion: 0 }
  return {
    prompt: readNumber(usage, SseField.PromptTokens) || readNumber(usage, SseField.InputTokens),
    completion:
      readNumber(usage, SseField.CompletionTokens) || readNumber(usage, SseField.OutputTokens),
  }
}

function toolOf(frames: Record<string, unknown>[]): string {
  let tool = ''
  for (const frame of frames) {
    const type = typeof frame[SseField.Type] === 'string' ? frame[SseField.Type] : ''
    const toolName =
      (typeof frame[SseField.ToolName] === 'string' && frame[SseField.ToolName]) ||
      (typeof frame[SseField.Name] === 'string' && frame[SseField.Name]) ||
      ''
    if ((type === ChunkType.ToolCall || type === ChunkType.ToolInput || type.includes(ChunkType.Tool)) && toolName) {
      tool = toolName
    }
  }
  return tool
}

function streamOf(frames: Record<string, unknown>[]): string {
  for (const frame of frames) {
    const type = typeof frame[SseField.Type] === 'string' ? frame[SseField.Type] : ''
    const delta =
      (typeof frame[SseField.Delta] === 'string' && frame[SseField.Delta]) ||
      (typeof frame[SseField.Text] === 'string' && frame[SseField.Text]) ||
      ''
    if ((type === ChunkType.TextDelta || type === ChunkType.Text) && delta) {
      return delta.replace(/\s+/g, ' ').trim().slice(0, STREAM_PREVIEW)
    }
  }
  return ''
}

function modelOf(frames: Record<string, unknown>[], fallback: string): string {
  for (const frame of frames) {
    if (typeof frame[SseField.Model] === 'string' && frame[SseField.Model]) return frame[SseField.Model]
  }
  return fallback
}

function lastUserPrompt(body: unknown): string {
  if (!isRecord(body)) return ''
  const messages = body[SseField.Messages]
  if (!Array.isArray(messages) || messages.length === 0) return ''
  const last: unknown = messages[messages.length - 1]
  if (!isRecord(last)) return ''
  const content = last[SseField.Content]
  if (typeof content === 'string') return content.replace(/\s+/g, ' ').trim().slice(0, STREAM_PREVIEW)
  return ''
}

function requestModel(request: Request): string {
  try {
    const body: unknown = request.postDataJSON()
    if (isRecord(body) && typeof body[SseField.ModelName] === 'string') return body[SseField.ModelName]
  } catch {
    return ''
  }
  return ''
}

export interface St1Progress {
  startedAt: number
  promptTokens: number
  completionTokens: number
  costUsd: number
  model: string
}

export function startSt1Progress(page: Page): St1Progress {
  console.log(ProgressCopy.Banner)
  const session: St1Progress = {
    startedAt: Date.now(),
    promptTokens: 0,
    completionTokens: 0,
    costUsd: 0,
    model: '',
  }
  page.on('request', request => {
    logOutgoingPrompt(request, session)
  })
  page.on('response', response => {
    void tapSpendResponse(response, session)
  })
  return session
}

export function logCanvasWaiting(): void {
  console.log(ProgressCopy.CanvasWait)
}

export function logSt1Step(session: St1Progress, step: St1Step): void {
  console.log(`ST-1  ${step}     ${formatDuration(Date.now() - session.startedAt)}`)
}

export function logOpenRouter402(body: string): void {
  if (body.includes(SmokeMatch.InFlightRequests)) {
    console.log(ProgressCopy.InFlight)
    return
  }
  console.log(ProgressCopy.Insufficient)
}

function logOutgoingPrompt(request: Request, session: St1Progress): void {
  if (request.method() !== FlowHttp.Post) return
  if (!isSpendUrl(request.url())) return
  const model = requestModel(request)
  if (model) session.model = model
  try {
    const prompt = lastUserPrompt(request.postDataJSON())
    if (prompt) console.log(`${ProgressCopy.Prompt}${prompt}`)
  } catch {
    /* body not JSON */
  }
}

function logTurn(
  session: St1Progress,
  model: string,
  promptTokens: number,
  completionTokens: number,
  tool: string,
  stream: string,
): void {
  const turnCost = costUsd(model || session.model, promptTokens, completionTokens)
  session.promptTokens += promptTokens
  session.completionTokens += completionTokens
  session.costUsd += turnCost
  if (model) {
    session.model = model
    console.log(`${ProgressCopy.Model}${openRouterModelId(model)}`)
  } else if (session.model) {
    console.log(`${ProgressCopy.Model}${openRouterModelId(session.model)}`)
  } else {
    console.log(`${ProgressCopy.Model}0`)
  }
  console.log(
    `${ProgressCopy.Turn}${promptTokens}${ProgressCopy.Out}${completionTokens}${formatUsd(turnCost)}`,
  )
  console.log(
    `${ProgressCopy.Session}${session.promptTokens}${ProgressCopy.Out}${session.completionTokens}${formatUsd(session.costUsd)}`,
  )
  if (tool) console.log(`${ProgressCopy.Tool}${tool}`)
  if (stream) console.log(`${ProgressCopy.Stream}${stream}`)
}

async function tapSpendResponse(response: Response, session: St1Progress): Promise<void> {
  if (!isSpendUrl(response.url())) return
  if (response.request().method() !== FlowHttp.Post) return
  if (response.status() === SmokeHttpStatus.PaymentRequired) {
    logOpenRouter402(await response.text().catch(() => ''))
    return
  }
  const body = await response.text().catch(() => '')
  const frames = parseSseObjects(body)
  let promptTokens = 0
  let completionTokens = 0
  for (const frame of frames) {
    const next = usageOf(frame)
    promptTokens += next.prompt
    completionTokens += next.completion
  }
  logTurn(
    session,
    modelOf(frames, requestModel(response.request())),
    promptTokens,
    completionTokens,
    toolOf(frames),
    streamOf(frames),
  )
}
