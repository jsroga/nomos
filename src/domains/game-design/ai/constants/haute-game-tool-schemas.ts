import { z } from 'zod'
import {
  HauteGameComplexityTarget,
  HauteGameCopy,
  HauteGameMultiplayerModel,
  HauteGamePersistenceLevel,
  HauteGamePacing,
  HauteGameSkillCurve,
  HauteGameStakesLevel,
  HauteGameTimeScope,
} from './haute-game-tool-wire'

export const AtomicLoomInputSchema = z.object({
  gameDescription: z.string().describe(HauteGameCopy.GameConceptDescribe),
  genre: z.string().describe(HauteGameCopy.GenreDescribe),
  existingMechanics: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
  complexityTarget: z
    .enum([
      HauteGameComplexityTarget.Minimal,
      HauteGameComplexityTarget.Moderate,
      HauteGameComplexityTarget.Complex,
    ])
    .default(HauteGameComplexityTarget.Moderate),
})

export const MemoryKeeperInputSchema = z.object({
  gameContext: z.string().describe('Current game/story context'),
  playerActions: z
    .array(
      z.object({
        action: z.string(),
        target: z.string().optional(),
        location: z.string().optional(),
      })
    )
    .optional(),
  npcs: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        faction: z.string().optional(),
      })
    )
    .optional(),
  timeScope: z
    .enum([
      HauteGameTimeScope.Session,
      HauteGameTimeScope.Campaign,
      HauteGameTimeScope.Persistent,
    ])
    .default(HauteGameTimeScope.Campaign),
})

export const GreyPaletteInputSchema = z.object({
  situation: z.string().describe(HauteGameCopy.SituationDescribe),
  factions: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()),
        playerRelation: z.enum(['allied', 'neutral', 'hostile']).optional(),
      })
    )
    .optional(),
  stakes: z
    .enum([
      HauteGameStakesLevel.Personal,
      HauteGameStakesLevel.Local,
      HauteGameStakesLevel.Regional,
      HauteGameStakesLevel.World,
    ])
    .default(HauteGameStakesLevel.Local),
  genre: z.string().optional(),
})

export const StrandWeaverInputSchema = z.object({
  gameType: z.string().describe(HauteGameCopy.GameTypeDescribe),
  multiplayerModel: z
    .enum([
      HauteGameMultiplayerModel.None,
      HauteGameMultiplayerModel.Async,
      HauteGameMultiplayerModel.Coop,
      HauteGameMultiplayerModel.Competitive,
    ])
    .default(HauteGameMultiplayerModel.Async),
  persistenceLevel: z
    .enum([
      HauteGamePersistenceLevel.Session,
      HauteGamePersistenceLevel.Server,
      HauteGamePersistenceLevel.Global,
    ])
    .default(HauteGamePersistenceLevel.Server),
  connectionTheme: z.string().optional().describe(HauteGameCopy.ConnectionThemeDescribe),
})

export const SilentTeacherInputSchema = z.object({
  mechanicsToTeach: z.array(
    z.object({
      name: z.string(),
      complexity: z.enum(['simple', 'moderate', 'complex']),
      dependencies: z.array(z.string()).optional(),
    })
  ),
  playerSkillCurve: z
    .enum([
      HauteGameSkillCurve.Gentle,
      HauteGameSkillCurve.Moderate,
      HauteGameSkillCurve.Steep,
    ])
    .default(HauteGameSkillCurve.Moderate),
  genre: z.string().optional(),
})

export const MundanePoetInputSchema = z.object({
  routineMechanics: z.array(
    z.object({
      name: z.string(),
      currentFeeling: z.enum(['boring', 'neutral', 'satisfying']),
      frequency: z.enum(['constant', 'frequent', 'occasional', 'rare']),
    })
  ),
  gameTheme: z.string().describe(HauteGameCopy.GameThemeDescribe),
  pacing: z
    .enum([
      HauteGamePacing.Meditative,
      HauteGamePacing.Balanced,
      HauteGamePacing.Intense,
    ])
    .default(HauteGamePacing.Balanced),
})
