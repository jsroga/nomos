export enum ScorerInspectMarker {
  Iq200 = '=== IQ 200 CONTEXT ENGINEERING',
  InputMessages = 'inputMessages',
  RememberedMessages = 'rememberedMessages',
  Format2 = '"format":2',
  SmokeFixture = 'Smoke Fixture',
}

export enum ScorerInspectField {
  InputMessages = 'inputMessages',
  RememberedMessages = 'rememberedMessages',
  SystemMessages = 'systemMessages',
  Message = 'message',
  Content = 'content',
  Role = 'role',
  User = 'user',
  Assistant = 'assistant',
  Text = 'text',
}

export const SCORER_INSPECT_MAX_EXCERPT = 1200
