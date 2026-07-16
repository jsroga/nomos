import {
  isPlainObject,
  recordArrayFromJson,
  recordFromJson,
  readString,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import {
  LLM_LOG_USER_ROLE,
  LlmContentPartType,
  LlmLogSanitize,
  LlmResponseField,
} from '@/trigger/constants/llm-logger'

function extractDataArrayUrls(record: Record<string, unknown>): string[] {
  const urls: string[] = []
  for (const item of recordArrayFromJson(record.data)) {
    const url = readString(item.url)
    if (url) urls.push(url)
    if (LlmResponseField.B64Json in item && item[LlmResponseField.B64Json] !== undefined) {
      urls.push(LlmLogSanitize.Base64Image)
    }
  }
  return urls
}

function extractCandidateUrls(record: Record<string, unknown>): string[] {
  const urls: string[] = []
  for (const candidate of recordArrayFromJson(record.candidates)) {
    const content = recordFromJson(candidate.content)
    for (const part of recordArrayFromJson(content.parts)) {
      if (LlmResponseField.InlineData in part || LlmResponseField.InlineDataCamel in part) {
        urls.push(LlmLogSanitize.Base64Image)
      }
    }
  }
  return urls
}

function extractOutputFieldUrls(record: Record<string, unknown>): string[] {
  const output = recordFromJson(record.output)
  if (Object.keys(output).length === 0) return []

  const urls: string[] = []
  const imageUrl = readString(output.image_url)
  if (imageUrl) urls.push(imageUrl)
  urls.push(...stringArrayFromJson(output.image_urls))
  return urls
}

function extractTopLevelImageUrls(record: Record<string, unknown>): string[] {
  const urls: string[] = []
  const imageUrl = readString(record.image_url)
  if (imageUrl) urls.push(imageUrl)
  urls.push(...stringArrayFromJson(record.image_urls))
  return urls
}

function extractNestedObjectUrls(record: Record<string, unknown>): string[] {
  const urls: string[] = []
  for (const value of Object.values(record)) {
    if (isPlainObject(value) || Array.isArray(value)) {
      urls.push(...extractImageUrls(value))
    }
  }
  return urls
}

export function extractImageUrls(data: unknown): string[] {
  if (!data) return []

  if (Array.isArray(data)) {
    return [...new Set(data.flatMap(item => extractImageUrls(item)))]
  }

  const record = recordFromJson(data)
  const urls = [
    ...extractDataArrayUrls(record),
    ...extractCandidateUrls(record),
    ...extractOutputFieldUrls(record),
    ...extractTopLevelImageUrls(record),
    ...extractNestedObjectUrls(record),
  ]

  return [...new Set(urls)]
}

function promptFromMessages(messages: unknown): string | undefined {
  const userMessage = recordArrayFromJson(messages).find(
    message => readString(message.role) === LLM_LOG_USER_ROLE
  )
  if (!userMessage) return undefined

  const directContent = readString(userMessage.content)
  if (directContent) return directContent

  for (const part of recordArrayFromJson(userMessage.content)) {
    if (readString(part.type) === LlmContentPartType.Text) {
      const text = readString(part.text)
      if (text) return text
    }
  }

  return undefined
}

function promptFromContents(contents: unknown): string | undefined {
  for (const content of recordArrayFromJson(contents)) {
    for (const part of recordArrayFromJson(content.parts)) {
      const text = readString(part.text)
      if (text) return text
    }
  }
  return undefined
}

export function extractPrompt(data: unknown): string | undefined {
  if (!data) return undefined

  const record = recordFromJson(data)
  const directPrompt = readString(record.prompt) ?? readString(record.text)
  if (directPrompt) return directPrompt

  return promptFromMessages(record.messages) ?? promptFromContents(record.contents)
}
