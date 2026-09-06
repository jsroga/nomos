import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'
import {
  canSendToSession,
  moduleHasAgent,
  parseWorkspaceModuleId,
} from '@/shared/chat/core/chat-session-policy'

describe('canSendToSession', () => {
  it('allows a matching storyteller session', () => {
    expect(
      canSendToSession(AppModuleId.Storyteller, AppModuleId.Storyteller, true),
    ).toBe(ChatSessionSendDecision.Ok)
  })

  it('mismatches loop-creator session on storyteller', () => {
    expect(
      canSendToSession(AppModuleId.LoopCreator, AppModuleId.Storyteller, true),
    ).toBe(ChatSessionSendDecision.ModuleMismatch)
  })

  it('blocks send on canvas modules that have no chat agent', () => {
    expect(
      canSendToSession(AppModuleId.Storyteller, AppModuleId.WorldBuilding, false),
    ).toBe(ChatSessionSendDecision.ModuleHasNoAgent)
    expect(
      canSendToSession(AppModuleId.Storyteller, AppModuleId.InteriorDesigner, false),
    ).toBe(ChatSessionSendDecision.ModuleHasNoAgent)
    expect(
      canSendToSession(AppModuleId.Storyteller, AppModuleId.AssetExporter, false),
    ).toBe(ChatSessionSendDecision.ModuleHasNoAgent)
  })
})

describe('moduleHasAgent', () => {
  it('is true for storyteller and false for canvas modules', () => {
    expect(moduleHasAgent(AppModuleId.Storyteller)).toBe(true)
    expect(moduleHasAgent(AppModuleId.WorldBuilding)).toBe(false)
    expect(moduleHasAgent(AppModuleId.InteriorDesigner)).toBe(false)
    expect(moduleHasAgent(AppModuleId.AssetExporter)).toBe(false)
  })
})

describe('parseWorkspaceModuleId', () => {
  it('reads /{projectId}/{segment} with no /app/ prefix', () => {
    const projectId = '11111111-1111-4111-8111-111111111111'
    expect(parseWorkspaceModuleId(`/${projectId}/${AppModuleId.Storyteller}`)).toBe(
      AppModuleId.Storyteller,
    )
    expect(parseWorkspaceModuleId(`/${projectId}/${AppModuleId.AssetExporter}`)).toBe(
      AppModuleId.AssetExporter,
    )
    expect(parseWorkspaceModuleId(`/app/${projectId}/${AppModuleId.Storyteller}`)).toBe(null)
  })
})
