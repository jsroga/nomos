/**
 * Chat SSE frame protocol (PLAN-V2 3.2) — THE shared vocabulary between
 * emitting routes (e.g. storyteller `chat/stream/stream-wire.ts`) and the
 * consuming `useChatStream` hook. One enum, two sides — route and hook can
 * no longer drift.
 *
 * FROZEN WIRE CONTRACT: values must stay byte-identical to the historical
 * literals. Adding a member is additive and safe; changing a value is a
 * breaking protocol change (consult the sse-wire-contract skill).
 */

export enum ChatFrameType {
  Start = 'start',
  Token = 'token',
  Thinking = 'thinking',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  Questions = 'questions',
  AwaitingInput = 'awaiting_input',
  Info = 'info',
  Navigation = 'navigation',
  Action = 'action',
  Message = 'message',
  AgentStatus = 'agent_status',
  SectionLoading = 'section_loading',
  Error = 'error',
  Complete = 'complete',
  // Loop-creator / legacy generation frames still parsed by the hook:
  SectionStart = 'section_start',
  SectionComplete = 'section_complete',
  SectionError = 'section_error',
  Citation = 'citation',
  Citations = 'citations',
  Grounding = 'grounding',
  Node = 'node',
  NodeStart = 'node_start',
  NodeComplete = 'node_complete',
  State = 'state',
  // Legacy completion aliases still parsed by useChatStream:
  Done = 'done',
  Terminated = 'terminated',
}
