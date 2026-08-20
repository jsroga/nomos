import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { StoryboardVideoLook } from '@/shared/ai/storyboard-video-env'
import {
  buildStoryboardVoiceoverFallback,
  capStoryboardVoiceoverScript,
  packagedFfmpegBinary,
  StoryboardFfmpegPackage,
  StoryboardTtsInstructions,
  storyboardTtsInstructions,
  storyboardVoiceoverMixFilter,
  storyboardVoiceoverSystemPrompt,
  storyboardVoiceoverWordBudget,
  resolveStoryboardBin,
  STORYBOARD_VOICEOVER_WORDS_PER_SECOND,
} from '../constants/storyboard-video-voiceover'

describe('storyboard voiceover script', () => {
  it('sizes the word budget to the clip duration', () => {
    expect(storyboardVoiceoverWordBudget(15)).toBe(
      Math.round(15 * STORYBOARD_VOICEOVER_WORDS_PER_SECOND),
    )
    expect(storyboardVoiceoverWordBudget(0)).toBe(12)
  })

  it('caps a long script to the budget', () => {
    expect(capStoryboardVoiceoverScript('one two three four five', 3)).toBe('one two three')
  })

  it('builds a fallback from beat loglines without exceeding the budget', () => {
    const script = buildStoryboardVoiceoverFallback(
      [{ logline: 'Hero arrives at dawn' }, { logline: 'The door opens on fire' }],
      4,
    )
    expect(script.split(/\s+/).length).toBeLessThanOrEqual(4)
    expect(script).toContain('Hero')
  })

  it('uses a film vs storyboard narrator lock', () => {
    expect(storyboardVoiceoverSystemPrompt(StoryboardVideoLook.Film, 15)).toContain('live-action')
    expect(storyboardVoiceoverSystemPrompt(StoryboardVideoLook.Storyboard, 15)).toContain(
      'storyboard animatic',
    )
  })

  it('locks TTS delivery to look and opening-beat register', () => {
    const film = storyboardTtsInstructions(StoryboardVideoLook.Film, [
      { logline: 'A debt collector walks a frozen city' },
    ])
    const board = storyboardTtsInstructions(StoryboardVideoLook.Storyboard, [
      { logline: 'A debt collector walks a frozen city' },
    ])
    expect(film).toContain(StoryboardTtsInstructions.Film)
    expect(film).toContain(StoryboardTtsInstructions.RegisterPrefix)
    expect(film).toContain('debt collector')
    expect(board).toContain(StoryboardTtsInstructions.Storyboard)
    expect(board).not.toContain(StoryboardTtsInstructions.Film)
  })

  it('ducks the native bed when the clip already has audio', () => {
    const withBed = storyboardVoiceoverMixFilter(15, true)
    expect(withBed).toContain('[bed]')
    expect(withBed).toContain('[aout]')
    expect(storyboardVoiceoverMixFilter(15, false)).not.toContain('[bed]')
  })

  it('prefers an existing FFMPEG_PATH then the packaged binary', () => {
    const present = new Set(['/usr/bin/ffmpeg', '/opt/ffmpeg'])
    const exists = (binPath: string) => present.has(binPath)
    expect(resolveStoryboardBin('/usr/bin/ffmpeg', '/opt/ffmpeg', 'ffmpeg', exists)).toBe(
      '/usr/bin/ffmpeg',
    )
    expect(resolveStoryboardBin('/missing', '/opt/ffmpeg', 'ffmpeg', exists)).toBe('/opt/ffmpeg')
    expect(resolveStoryboardBin('', undefined, 'ffmpeg', exists)).toBe('ffmpeg')
  })

  it('finds ffmpeg-static under node_modules from a nested start dir', () => {
    const nested = join(process.cwd(), 'src', 'domains', 'storyteller', 'tasks')
    const found = packagedFfmpegBinary(nested)
    expect(found).toBeDefined()
    expect(found).toContain(StoryboardFfmpegPackage.Ffmpeg)
  })
})
