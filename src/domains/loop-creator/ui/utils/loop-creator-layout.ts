/** Loop creator layout — agent styling, canvas wire values, UI copy. */

import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { CANVAS_NODE_TYPE_GROUP } from '@/domains/loop-creator/constants/graph-state-defaults'

export enum LoopCreatorAgentKey {
  System = 'System',
  Supervisor = 'supervisor',
  LoopPlanner = 'loop_planner',
  MechanicsDesigner = 'mechanics_designer',
  BalanceAnalyst = 'balance_analyst',
  ProgressionArchitect = 'progression_architect',
  MarketAnalyst = 'market_analyst',
  LoopAssistant = 'LoopAssistant',
  User = 'User',
}

export enum LoopAgentTextClass {
  Muted = 'text-muted-foreground',
  Blue = 'text-blue-400',
  Purple = 'text-purple-400',
  Emerald = 'text-emerald-400',
  Amber = 'text-amber-400',
  Rose = 'text-rose-400',
  Indigo = 'text-indigo-400',
  Foreground = 'text-foreground',
}

export enum LoopAgentBgClass {
  System = 'bg-muted/50 border-border',
  Blue = 'bg-blue-500/10 border-blue-500/30',
  Purple = 'bg-purple-500/10 border-purple-500/30',
  Emerald = 'bg-emerald-500/10 border-emerald-500/30',
  Amber = 'bg-amber-500/10 border-amber-500/30',
  Rose = 'bg-rose-500/10 border-rose-500/30',
  Indigo = 'bg-indigo-500/10 border-indigo-500/30',
  Card = 'bg-card border-border',
}

export enum LoopFlowNodeType {
  Challenge = 'challengeNode',
  Action = 'actionNode',
  Reward = 'rewardNode',
  Feedback = 'feedbackNode',
  Group = 'group',
}

export enum LoopCanvasKind {
  Loop = 'loop',
}

export enum LoopSuggestionKind {
  AddNode = 'ADD_NODE',
  RemoveNode = 'REMOVE_NODE',
  AddEdge = 'ADD_EDGE',
  RemoveEdge = 'REMOVE_EDGE',
  ModifyNode = 'MODIFY_NODE',
  ModifyEdge = 'MODIFY_EDGE',
  RemoveAllNodes = 'REMOVE_ALL_NODES',
}

export enum LoopSuggestionEntitySuffix {
  Single = 'single',
}

export enum LoopFlowNodeDataField {
  Label = 'label',
}

export enum LoopLayoutAgentAction {
  AddMechanic = 'ADD_MECHANIC',
  AddConnection = 'ADD_CONNECTION',
  AddEdge = 'ADD_EDGE',
  AddNode = 'ADD_NODE',
  RemoveNode = 'REMOVE_NODE',
  RemoveAllNodes = 'REMOVE_ALL_NODES',
  ModifyNode = 'MODIFY_NODE',
  RemoveEdge = 'REMOVE_EDGE',
  MarketAnalysisComplete = 'MARKET_ANALYSIS_COMPLETE',
}

export enum LoopChatMessageType {
  Ai = 'ai',
  Human = 'human',
}

export enum LoopLlmRole {
  User = 'user',
  Assistant = 'assistant',
}

export const LOOP_CREATOR_WELCOME_MESSAGE = `👋 Hello! I'm your Game Loop Design Assistant. I coordinate a team of specialists to help you create engaging game mechanics and loops.

**My team includes:**
- 🎯 **Loop Planner** - Designs overall loop structure
- ⚙️ **Mechanics Designer** - Creates individual mechanics
- ⚖️ **Balance Analyst** - Evaluates effort/reward balance
- 📈 **Progression Architect** - Designs progression systems

To get started, tell me about the game you're designing. What **genre** and **platform** are you targeting?`

export enum LoopNodeTimescale {
  Custom = 'custom',
}

export enum LoopPlayerAgencyLevel {
  Medium = 'medium',
}

export enum LoopMechanicKind {
  Core = 'core',
}

export enum LoopEdgeType {
  Smoothstep = 'smoothstep',
}

export enum LoopEdgeLabel {
  Triggers = 'triggers',
}

export enum LoopFlowPosition {
  Bottom = 'bottom',
  Top = 'top',
}

export enum LoopGroupBorderStyle {
  Dashed = 'dashed',
}

export const LOOP_NEW_NODE_LABEL = 'New Node'
export const LOOP_NEW_CHALLENGE_LABEL = 'New Challenge'
export const LOOP_NEW_ACTION_LABEL = 'New Action'
export const LOOP_NEW_REWARD_LABEL = 'New Reward'
export const LOOP_NEW_FEEDBACK_LABEL = 'New Feedback'
export const LOOP_NEW_LOOP_LABEL = 'New Loop'

export const LOOP_CHALLENGE_DESCRIPTION = 'Describe the obstacle or goal'
export const LOOP_ACTION_DESCRIPTION = 'Describe the player input or decision'
export const LOOP_REWARD_DESCRIPTION = 'Describe the positive outcome'
export const LOOP_FEEDBACK_DESCRIPTION = 'Describe the information provided to player'
export const LOOP_GROUP_DESCRIPTION = 'A timescale loop container'

export const LOOP_GROUP_BG_COLOR = 'rgba(100, 100, 255, 0.05)'
export const LOOP_GROUP_BORDER_COLOR = '#6466f1'

export const LOOP_CONNECTION_STROKE = 'hsl(235 88% 65%)'
export const LOOP_IMPORT_EDGE_LABEL_BG = '#0d0d14'
export const LOOP_IMPORT_EDGE_LABEL_FILL = '#fff'

export const LOOP_GENRE_JOIN = ', '
export const LOOP_JSON_EXTENSION = '.json'

export const LOOP_CREATE_FAILED_ERROR = 'Failed to create loop'
export const LOOP_JSON_PARSE_ALERT =
  'Failed to parse JSON file. Please ensure it follows the correct format.'

export const LOOP_LOG_LOOP_CREATED = '✅ Loop created:'
export const LOOP_LOG_CREATE_FAILED = 'Failed to create loop:'
export const LOOP_LOG_SWITCHED_LOOP = '✅ Switched to loop:'
export const LOOP_LOG_CANVAS_RESET = '✅ Canvas reset'
export const LOOP_LOG_AUTO_START = '🚀 Loop created, auto-starting generation with concept:'
export const LOOP_LOG_ACCEPT_SUGGESTION = '✅ Accepting suggestion:'
export const LOOP_LOG_CLEAR_CANVAS = '🗑️ Clearing all nodes and edges from canvas'
export const LOOP_LOG_REJECT_SUGGESTION = '❌ Rejecting suggestion:'
export const LOOP_LOG_APPLY_ALL = '✅ Applying all suggestions:'
export const LOOP_LOG_APPLIED_ALL = '✅ Applied all suggestions and tidied layout'
export const LOOP_LOG_JSON_PARSE_ERROR = 'Error parsing JSON:'
export const LOOP_LOG_ACTION_RECEIVED = '[LoopCreator] Action received:'
export const LOOP_LOG_MARKET_ANALYSIS_OPEN = '[LoopCreator] Market analysis complete, opening panel'
export const LOOP_LOG_UNKNOWN_ACTION = '[LoopCreator] Unknown action type:'
export const LOOP_LOG_SEND_AUTO_MESSAGE = '📤 Sending auto-message:'
export const LOOP_LOG_AUTO_MESSAGE_SUFFIX = '...'

export const LOOP_MECHANIC_LABEL_SUFFIX = 'mechanic'
export const LOOP_MODIFY_NODE_JOIN = ', '

export const LOOP_DOMAIN_TO_FLOW_NODE: Record<LoopNodeType, LoopFlowNodeType> = {
  [LoopNodeType.Challenge]: LoopFlowNodeType.Challenge,
  [LoopNodeType.Action]: LoopFlowNodeType.Action,
  [LoopNodeType.Reward]: LoopFlowNodeType.Reward,
  [LoopNodeType.Feedback]: LoopFlowNodeType.Feedback,
}

export const LOOP_DOMAIN_TO_FLOW_NODE_WITH_GROUP: Record<
  LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP,
  LoopFlowNodeType
> = {
  ...LOOP_DOMAIN_TO_FLOW_NODE,
  [CANVAS_NODE_TYPE_GROUP]: LoopFlowNodeType.Group,
}

export const LOOP_CREATE_DEFAULT_LABELS: Record<
  LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP,
  string
> = {
  [LoopNodeType.Challenge]: LOOP_NEW_CHALLENGE_LABEL,
  [LoopNodeType.Action]: LOOP_NEW_ACTION_LABEL,
  [LoopNodeType.Reward]: LOOP_NEW_REWARD_LABEL,
  [LoopNodeType.Feedback]: LOOP_NEW_FEEDBACK_LABEL,
  [CANVAS_NODE_TYPE_GROUP]: LOOP_NEW_LOOP_LABEL,
}

export const LOOP_CREATE_DEFAULT_DESCRIPTIONS: Record<
  LoopNodeType | typeof CANVAS_NODE_TYPE_GROUP,
  string
> = {
  [LoopNodeType.Challenge]: LOOP_CHALLENGE_DESCRIPTION,
  [LoopNodeType.Action]: LOOP_ACTION_DESCRIPTION,
  [LoopNodeType.Reward]: LOOP_REWARD_DESCRIPTION,
  [LoopNodeType.Feedback]: LOOP_FEEDBACK_DESCRIPTION,
  [CANVAS_NODE_TYPE_GROUP]: LOOP_GROUP_DESCRIPTION,
}

export const LOOP_SUGGESTION_SORT_ORDER: Record<LoopSuggestionKind, number> = {
  [LoopSuggestionKind.RemoveAllNodes]: 0,
  [LoopSuggestionKind.AddNode]: 1,
  [LoopSuggestionKind.ModifyNode]: 2,
  [LoopSuggestionKind.AddEdge]: 3,
  [LoopSuggestionKind.ModifyEdge]: 4,
  [LoopSuggestionKind.RemoveEdge]: 5,
  [LoopSuggestionKind.RemoveNode]: 6,
}

export const LOOP_SUGGESTION_SORT_FALLBACK = 99

const LOOP_SUGGESTION_KIND_VALUES = new Set<string>(Object.values(LoopSuggestionKind))

export function isLoopSuggestionKind(value: string): value is LoopSuggestionKind {
  return LOOP_SUGGESTION_KIND_VALUES.has(value)
}

export function loopSuggestionSortOrder(type: string): number {
  if (isLoopSuggestionKind(type)) {
    return LOOP_SUGGESTION_SORT_ORDER[type]
  }
  return LOOP_SUGGESTION_SORT_FALLBACK
}

export function flowNodeTypeForDomain(
  nodeType: string | undefined,
  fallback: LoopFlowNodeType = LoopFlowNodeType.Action
): string {
  if (!nodeType) return fallback
  if (nodeType === LoopNodeType.Challenge) return LoopFlowNodeType.Challenge
  if (nodeType === LoopNodeType.Action) return LoopFlowNodeType.Action
  if (nodeType === LoopNodeType.Reward) return LoopFlowNodeType.Reward
  if (nodeType === LoopNodeType.Feedback) return LoopFlowNodeType.Feedback
  if (nodeType === CANVAS_NODE_TYPE_GROUP) return LoopFlowNodeType.Group
  return fallback
}
