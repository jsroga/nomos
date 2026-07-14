import { FileEncoding, StringSeparator } from '@/shared/data/constants/protocol'

export enum SkillFileName {
  Main = 'SKILL.md',
}

export enum SkillDirectory {
  References = 'references',
}

export enum SkillFileExtension {
  Markdown = '.md',
}

export const SKILL_LOADER_ENCODING = FileEncoding.Utf8

export enum SkillLoaderHeading {
  ReferenceMaterials = '## Reference Materials',
}

export const SKILL_LOADER_SEPARATOR = {
  ReferenceBlock: `${StringSeparator.DoubleNewline}${SkillLoaderHeading.ReferenceMaterials}${StringSeparator.DoubleNewline}`,
  SkillsJoin: StringSeparator.DoubleNewline,
} as const
