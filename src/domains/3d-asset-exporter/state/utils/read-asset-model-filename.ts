import { readString } from '@/shared/data/json-guards'

export enum AssetModelFilenameField {
  Snake = 'model_filename',
  Camel = 'modelFilename',
}

export function readAssetModelFilename(data: Record<string, unknown>): string | undefined {
  return (
    readString(data[AssetModelFilenameField.Snake]) ??
    readString(data[AssetModelFilenameField.Camel])
  )
}
