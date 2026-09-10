export {
  MATERIAL_3D_PRESETS,
  MaterialGenerationStage,
  MaterialGenerationStageCopy,
  PROMPT_PRESETS,
  STYLE_OPTIONS,
  TextureStyleLabel,
} from '../constants/surface-properties-presets'
import {
  MaterialGenerationStage,
  MaterialGenerationStageCopy,
} from '../constants/surface-properties-presets'

export function getMaterialGenerationStageLabel(
  stage: string | undefined,
  progress: number
): string {
  if (stage === MaterialGenerationStage.Preview) {
    return `${MaterialGenerationStageCopy.Preview} ${progress}%`
  }
  if (stage === MaterialGenerationStage.Refine) {
    return `${MaterialGenerationStageCopy.Refine} ${progress}%`
  }
  if (stage === MaterialGenerationStage.Saving) {
    return `${MaterialGenerationStageCopy.Saving} ${progress}%`
  }
  if (stage === MaterialGenerationStage.Completed) {
    return MaterialGenerationStageCopy.Completed
  }
  return `${MaterialGenerationStageCopy.Processing} ${progress}%`
}
