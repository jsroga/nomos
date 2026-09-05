import { isScriptSlugline } from '@/domains/storyteller/core/manuscript/manuscript-span'

export interface ScriptDialogueLine {
  speaker: string | null
  text: string
}

enum ScriptDialogueMark {
  Newline = '\n',
  Contained = '(CONT\'D)',
  ContainedPlain = '(CONTD)',
  OffScreen = '(O.S.)',
  VoiceOver = '(V.O.)',
  IntoDash = '--',
}

enum ScriptTransition {
  CutTo = 'CUT TO:',
  FadeOut = 'FADE OUT',
  FadeIn = 'FADE IN',
  DissolveTo = 'DISSOLVE TO:',
}

const CUE_NAME_MAX = 40
const CUE_NAME_MIN = 2

function stripCueAnnotations(line: string): string {
  return line
    .replace(ScriptDialogueMark.Contained, '')
    .replace(ScriptDialogueMark.ContainedPlain, '')
    .replace(ScriptDialogueMark.OffScreen, '')
    .replace(ScriptDialogueMark.VoiceOver, '')
    .trim()
}

function isTransition(line: string): boolean {
  const upper = line.trim().toUpperCase()
  return (
    upper === ScriptTransition.CutTo ||
    upper === ScriptTransition.FadeOut ||
    upper === ScriptTransition.FadeIn ||
    upper === ScriptTransition.DissolveTo ||
    upper.startsWith(ScriptTransition.CutTo)
  )
}

function isParenthetical(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('(') && trimmed.endsWith(')')
}

function isCharacterCue(line: string): boolean {
  const stripped = stripCueAnnotations(line.trim())
  if (stripped.length < CUE_NAME_MIN || stripped.length > CUE_NAME_MAX) return false
  if (isScriptSlugline(stripped) || isTransition(stripped)) return false
  if (isParenthetical(stripped)) return false
  const letters = stripped.replace(/[.\s'-]/g, '')
  if (letters.length < CUE_NAME_MIN) return false
  return letters === letters.toUpperCase() && /[A-Z]/.test(letters)
}

function cueSpeaker(line: string): string {
  return stripCueAnnotations(line.trim())
}

export function extractScriptDialogue(manuscript: string): ScriptDialogueLine[] {
  const lines = manuscript.split(ScriptDialogueMark.Newline)
  const extracted: ScriptDialogueLine[] = []
  let speaker: string | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (line.length === 0) {
      speaker = null
      continue
    }
    if (isScriptSlugline(line) || isTransition(line)) {
      speaker = null
      continue
    }
    if (isCharacterCue(line)) {
      speaker = cueSpeaker(line)
      continue
    }
    if (isParenthetical(line)) continue
    extracted.push({ speaker, text: line })
  }

  return extracted
}

export function scriptDialogueBySpeaker(manuscript: string): Map<string, string[]> {
  const grouped = new Map<string, string[]>()
  for (const line of extractScriptDialogue(manuscript)) {
    const key = line.speaker ?? ''
    const existing = grouped.get(key) ?? []
    existing.push(line.text)
    grouped.set(key, existing)
  }
  return grouped
}
