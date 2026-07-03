/**
 * Wave 1 Structure Tests
 * 
 * Verifies the catalog cleanup Wave 1 structural integrity:
 * - Moved files resolve from new paths
 * - Cross-module moves work correctly
 * - Critical imports work end-to-end
 * 
 * These tests are behavior-focused: they verify the structure works,
 * not the specific names of every export.
 */

import { describe, it, expect } from 'vitest'

describe('Wave 1 - Core Reorganization (15 folders → 4 units)', () => {
  it('should import from core editing unit', async () => {
    const { deepMerge } = await import('@/domains/storyteller/core/editing')
    
    expect(typeof deepMerge).toBe('function')
  })

  it('should import from core entities unit', async () => {
    const { parseReferences } = await import('@/domains/storyteller/core/entities')
    
    expect(typeof parseReferences).toBe('function')
  })

  it('should import from core formatting unit', async () => {
    const { formatActionForDisplay } = await import('@/domains/storyteller/core/formatting')
    
    expect(typeof formatActionForDisplay).toBe('function')
  })
})

describe('Wave 1 - Agent Reorganization (17 folders → 8 units)', () => {
  it('should import judge agents from new path', async () => {
    const { runConsistencyCheck } = await import('@/domains/storyteller/agents/judges/ConsistencyAgent')
    
    expect(typeof runConsistencyCheck).toBe('function')
  })

  it('should import WorkflowContext from orchestration (moved from core)', async () => {
    const { WORKFLOW_EVENTS } = await import('@/domains/storyteller/agents/orchestration/WorkflowContext')
    
    expect(WORKFLOW_EVENTS).toBeDefined()
  })
})

describe('Wave 1 - Cross-Module Moves', () => {
  it('should import MastraInstance from shared/agent-kernel (moved from storyteller/agents)', async () => {
    const { getMastraInstance } = await import('@/shared/agent-kernel')
    
    expect(typeof getMastraInstance).toBe('function')
  })

  it('should import ModelConfig from storyteller/config (moved from agents)', async () => {
    const { GLOBAL_AGENT_MODEL, AGENT_RUNTIME_DEFAULTS } = await import('@/domains/storyteller/config/ModelConfig')
    
    expect(GLOBAL_AGENT_MODEL).toBeDefined()
    expect(AGENT_RUNTIME_DEFAULTS).toBeDefined()
  })

  it('should have storyteller.config.ts root seam', async () => {
    const config = await import('@/domains/storyteller/storyteller.config')
    
    expect(config.STORYTELLER_CONFIG).toBeDefined()
  })
})

describe('Wave 1 - Import Resolution Integrity', () => {
  it('should resolve state hooks from queries subdirectory', async () => {
    const { useBibleState } = await import('@/domains/storyteller/state/queries/useBibleState')
    const { useEpisodeData } = await import('@/domains/storyteller/state/queries/useEpisodeData')
    
    expect(typeof useBibleState).toBe('function')
    expect(typeof useEpisodeData).toBe('function')
  })
})
