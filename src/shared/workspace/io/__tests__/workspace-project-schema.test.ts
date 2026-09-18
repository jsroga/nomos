import { describe, expect, it } from 'vitest'
import { toWorkspaceProject, workspaceProjectResponseSchema } from '../workspace-project-schema'

const PROJECT_ID = '9b80467c-18b5-4570-9b32-d66f86d71986'
const CANVAS_REF = 'https://cdn.example/canvas.png'
const STORY_REF = 'https://cdn.example/story.png'

describe('workspaceProjectResponseSchema', () => {
  it('maps canvas and Storyteller style refs independently', () => {
    const project = toWorkspaceProject(
      workspaceProjectResponseSchema.parse({
        id: PROJECT_ID,
        name: 'Harbour',
        style_reference_urls: [CANVAS_REF],
        storyteller_style_reference_urls: [STORY_REF],
      }),
    )
    expect(project.styleReferenceUrls).toEqual([CANVAS_REF])
    expect(project.storytellerStyleReferenceUrls).toEqual([STORY_REF])
  })
})
