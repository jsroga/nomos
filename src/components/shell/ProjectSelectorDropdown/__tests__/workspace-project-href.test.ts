import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { workspaceHrefForProject } from '../workspace-project-href'

const PROJECT_A = '11111111-1111-4111-8111-111111111111'
const PROJECT_B = '22222222-2222-4222-8222-222222222222'

describe('workspaceHrefForProject', () => {
  it('keeps the current module and drops query string', () => {
    expect(
      workspaceHrefForProject(`/${PROJECT_A}/${AppModuleId.WorldBuilding}`, PROJECT_B),
    ).toBe(`/${PROJECT_B}/${AppModuleId.WorldBuilding}`)
  })

  it('opens storyteller when the path has no module', () => {
    expect(workspaceHrefForProject(null, PROJECT_B)).toBe(
      `/${PROJECT_B}/${AppModuleId.Storyteller}`,
    )
  })
})
