import {
  createGetLoopsTool,
  createGetLoopByIdTool,
  createGetMarketAnalysisTool,
} from '../tools/v2/loop-tools'
import {
  createIdentifyCoreLoopTool,
  createAnalyzeMechanicBalanceTool,
  createSuggestProgressionTool,
  createValidateLoopStructureTool,
} from '../tools/v2/logic-transformers'
import { createAllHauteGameTools } from '../tools/v2/haute-game-tools'

export type GameDesignDataTool =
  | ReturnType<typeof createGetLoopsTool>
  | ReturnType<typeof createGetLoopByIdTool>
  | ReturnType<typeof createGetMarketAnalysisTool>

export type GameDesignLogicTool =
  | ReturnType<typeof createIdentifyCoreLoopTool>
  | ReturnType<typeof createAnalyzeMechanicBalanceTool>
  | ReturnType<typeof createSuggestProgressionTool>
  | ReturnType<typeof createValidateLoopStructureTool>

export type GameDesignHauteTool = ReturnType<typeof createAllHauteGameTools>[number]

export type GameDesignTool = GameDesignDataTool | GameDesignLogicTool | GameDesignHauteTool

export interface GameDesignPlanPersistence {
  loadPlan: () => Promise<unknown | null>
  savePlan: (plan: unknown) => Promise<void>
}

export function createGameDesignToolList(): GameDesignTool[] {
  return [
    createGetLoopsTool(),
    createGetLoopByIdTool(),
    createGetMarketAnalysisTool(),
    createIdentifyCoreLoopTool(),
    createAnalyzeMechanicBalanceTool(),
    createSuggestProgressionTool(),
    createValidateLoopStructureTool(),
    ...createAllHauteGameTools(),
  ]
}
