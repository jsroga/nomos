export { createAtomicLoomTool, createSilentTeacherTool } from './haute-game-tools-klei'
export {
  createMemoryKeeperTool,
  createGreyPaletteTool,
  createStrandWeaverTool,
  createMundanePoetTool,
} from './haute-game-tools-narrative'

import { createAtomicLoomTool, createSilentTeacherTool } from './haute-game-tools-klei'
import {
  createMemoryKeeperTool,
  createGreyPaletteTool,
  createStrandWeaverTool,
  createMundanePoetTool,
} from './haute-game-tools-narrative'

export const createAllHauteGameTools = () => [
  createAtomicLoomTool(),
  createMemoryKeeperTool(),
  createGreyPaletteTool(),
  createStrandWeaverTool(),
  createSilentTeacherTool(),
  createMundanePoetTool(),
]
