export enum MeshySseEventName {
  Message = 'message',
  Error = 'error',
}

export enum MeshySseLinePrefix {
  Event = 'event:',
  Data = 'data:',
}

export interface MeshySseFrame {
  event: string
  json: unknown
}

export function appendMeshySseChunk(
  buffer: string,
  chunk: string,
): { frames: string[]; rest: string } {
  const combined = `${buffer}${chunk}`
  const parts = combined.split('\n\n')
  const rest = parts.pop() ?? ''
  return {
    frames: parts.filter(frame => frame.trim() !== ''),
    rest,
  }
}

function readMeshySseEventName(value: string): string {
  if (value === MeshySseEventName.Error) return MeshySseEventName.Error
  return MeshySseEventName.Message
}

export function parseMeshySseFrame(frame: string): MeshySseFrame | null {
  let event: string = MeshySseEventName.Message
  const dataLines: string[] = []

  for (const rawLine of frame.split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    if (line.startsWith(MeshySseLinePrefix.Event)) {
      event = readMeshySseEventName(line.slice(MeshySseLinePrefix.Event.length).trim())
    } else if (line.startsWith(MeshySseLinePrefix.Data)) {
      dataLines.push(line.slice(MeshySseLinePrefix.Data.length).trimStart())
    }
  }

  if (dataLines.length === 0) return null
  try {
    return { event, json: JSON.parse(dataLines.join('\n')) }
  } catch {
    return null
  }
}
