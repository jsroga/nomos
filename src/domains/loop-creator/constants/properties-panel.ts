/** Properties panel — node/agency/timescale option wire values. */

import { LoopNodeType } from '@/domains/loop-creator/constants/custom-nodes'
import { LoopTimescaleOrder } from '@/domains/loop-creator/constants/timescale-order'
import { LoopPlayerAgency } from '@/domains/loop-creator/constants/custom-nodes'

export enum PropertiesPanelNodeLabel {
  Challenge = 'Challenge',
  Action = 'Action',
  Reward = 'Reward',
  Feedback = 'Feedback',
}

export enum PropertiesPanelAgencyLabel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum PropertiesPanelTimescaleLabel {
  Moment = 'Moment (seconds)',
  Minute = 'Minute',
  Hour = 'Hour',
  Day = 'Day',
  Custom = 'Custom',
}

export enum PropertiesPanelTextClass {
  Challenge = 'text-red-400',
  Action = 'text-blue-400',
  Reward = 'text-yellow-400',
  Feedback = 'text-green-400',
}

export const PROPERTIES_PANEL_NODE_TYPE_OPTIONS = [
  {
    value: LoopNodeType.Challenge,
    label: PropertiesPanelNodeLabel.Challenge,
    color: PropertiesPanelTextClass.Challenge,
  },
  {
    value: LoopNodeType.Action,
    label: PropertiesPanelNodeLabel.Action,
    color: PropertiesPanelTextClass.Action,
  },
  {
    value: LoopNodeType.Reward,
    label: PropertiesPanelNodeLabel.Reward,
    color: PropertiesPanelTextClass.Reward,
  },
  {
    value: LoopNodeType.Feedback,
    label: PropertiesPanelNodeLabel.Feedback,
    color: PropertiesPanelTextClass.Feedback,
  },
] as const

export const PROPERTIES_PANEL_AGENCY_OPTIONS = [
  { value: LoopPlayerAgency.Low, label: PropertiesPanelAgencyLabel.Low },
  { value: LoopPlayerAgency.Medium, label: PropertiesPanelAgencyLabel.Medium },
  { value: LoopPlayerAgency.High, label: PropertiesPanelAgencyLabel.High },
] as const

export const PROPERTIES_PANEL_TIMESCALE_OPTIONS = [
  { value: LoopTimescaleOrder.Moment, label: PropertiesPanelTimescaleLabel.Moment },
  { value: LoopTimescaleOrder.Minute, label: PropertiesPanelTimescaleLabel.Minute },
  { value: LoopTimescaleOrder.Hour, label: PropertiesPanelTimescaleLabel.Hour },
  { value: LoopTimescaleOrder.Day, label: PropertiesPanelTimescaleLabel.Day },
  { value: LoopTimescaleOrder.Custom, label: PropertiesPanelTimescaleLabel.Custom },
] as const
