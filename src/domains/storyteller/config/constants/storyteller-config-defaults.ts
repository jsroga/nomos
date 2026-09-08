/** Storyteller module config wire values and prompt identifiers. */

export enum EnvFlagValue {
  True = 'true',
  False = 'false',
}

/** Minimum [Name][item|event|rule-id] links required in world description / roadmap prose. */
export const ENTITY_LINK_MIN_COUNT = 6

export enum GuardrailSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}
