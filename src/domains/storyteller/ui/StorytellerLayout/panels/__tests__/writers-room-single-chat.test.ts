import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const WRITERS_ROOM = 'src/domains/storyteller/ui/StorytellerLayout/panels/StorytellerWritersRoom.tsx'
const LOOP_SIDEBAR = 'src/domains/loop-creator/ui/components/LoopChatSidebar.tsx'

describe('writers-room-single-chat', () => {
  it('does not mount WritersRoomAssistantChat when the overlay flag is on', () => {
    const src = readFileSync(WRITERS_ROOM, 'utf8')
    expect(src).toContain('isWorkspaceChatOverlayEnabled()')
    expect(src).toContain('WritersRoomOverlayBridgePublisher')
    const overlayIdx = src.indexOf('if (isWorkspaceChatOverlayEnabled())')
    const flagOffReturn = src.lastIndexOf('return (')
    const overlayJsx = src.slice(overlayIdx, flagOffReturn)
    expect(overlayJsx).toContain('WritersRoomOverlayBridgePublisher')
    expect(overlayJsx).not.toContain('WritersRoomAssistantChat')
  })

  it('drops LoopChatSidebar AssistantChat when the overlay flag is on', () => {
    const src = readFileSync(LOOP_SIDEBAR, 'utf8')
    expect(src).toContain('if (isWorkspaceChatOverlayEnabled()) return null')
  })
})
