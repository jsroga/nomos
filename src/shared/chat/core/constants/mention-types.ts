/** Mention system category, label, icon, and type wire constants. */

export enum MentionCategoryId {
  Entity = 'entity',
  Agent = 'agent',
  Section = 'section',
}

export enum MentionCategoryLabel {
  Entities = 'ENTITIES',
  Agents = 'AGENTS',
  Sections = 'SECTIONS',
}

export enum MentionIconName {
  Database = 'Database',
  Bot = 'Bot',
  FileText = 'FileText',
  User = 'User',
  Tv = 'Tv',
  Zap = 'Zap',
  Users = 'Users',
  Cog = 'Cog',
  RefreshCw = 'RefreshCw',
  GitBranch = 'GitBranch',
  PenTool = 'PenTool',
  Building2 = 'Building2',
  Map = 'Map',
  AlertTriangle = 'AlertTriangle',
  FileEdit = 'FileEdit',
  Layout = 'Layout',
  Scale = 'Scale',
  TrendingUp = 'TrendingUp',
  Scroll = 'Scroll',
  Lightbulb = 'Lightbulb',
  Music = 'Music',
  Shuffle = 'Shuffle',
  BarChart = 'BarChart',
  Gamepad2 = 'Gamepad2',
}

export enum MentionEntityTypeId {
  Character = 'character',
  Episode = 'episode',
  Beat = 'beat',
  Faction = 'faction',
  Mechanic = 'mechanic',
  Loop = 'loop',
  Connection = 'connection',
}

export enum MentionAgentTypeId {
  Writer = 'writer',
  PremiseArchitect = 'premise_architect',
  PlotArchitect = 'plot_architect',
  DevilsAdvocate = 'devils_advocate',
  EpisodePremiseArchitect = 'episode_premise_architect',
  LoopPlanner = 'loop_planner',
  BalanceAnalyst = 'balance_analyst',
  MarketAnalyst = 'market_analyst',
}

export enum MentionSectionTypeId {
  WorldRules = 'worldRules',
  Inspirations = 'inspirations',
  Soundtracks = 'soundtracks',
  PlotTwists = 'plotTwists',
  BalanceAnalysis = 'balanceAnalysis',
  GameContext = 'gameContext',
}

export const CATEGORY_META: Record<
  MentionCategoryId,
  { label: MentionCategoryLabel; icon: MentionIconName }
> = {
  [MentionCategoryId.Entity]: {
    label: MentionCategoryLabel.Entities,
    icon: MentionIconName.Database,
  },
  [MentionCategoryId.Agent]: {
    label: MentionCategoryLabel.Agents,
    icon: MentionIconName.Bot,
  },
  [MentionCategoryId.Section]: {
    label: MentionCategoryLabel.Sections,
    icon: MentionIconName.FileText,
  },
}

export const TYPE_ICONS: Record<string, MentionIconName> = {
  [MentionEntityTypeId.Character]: MentionIconName.User,
  [MentionEntityTypeId.Episode]: MentionIconName.Tv,
  [MentionEntityTypeId.Beat]: MentionIconName.Zap,
  [MentionEntityTypeId.Faction]: MentionIconName.Users,
  [MentionEntityTypeId.Mechanic]: MentionIconName.Cog,
  [MentionEntityTypeId.Loop]: MentionIconName.RefreshCw,
  [MentionEntityTypeId.Connection]: MentionIconName.GitBranch,
  [MentionAgentTypeId.Writer]: MentionIconName.PenTool,
  [MentionAgentTypeId.PremiseArchitect]: MentionIconName.Building2,
  [MentionAgentTypeId.PlotArchitect]: MentionIconName.Map,
  [MentionAgentTypeId.DevilsAdvocate]: MentionIconName.AlertTriangle,
  [MentionAgentTypeId.EpisodePremiseArchitect]: MentionIconName.FileEdit,
  [MentionAgentTypeId.LoopPlanner]: MentionIconName.Layout,
  [MentionAgentTypeId.BalanceAnalyst]: MentionIconName.Scale,
  [MentionAgentTypeId.MarketAnalyst]: MentionIconName.TrendingUp,
  [MentionSectionTypeId.WorldRules]: MentionIconName.Scroll,
  [MentionSectionTypeId.Inspirations]: MentionIconName.Lightbulb,
  [MentionSectionTypeId.Soundtracks]: MentionIconName.Music,
  [MentionSectionTypeId.PlotTwists]: MentionIconName.Shuffle,
  [MentionSectionTypeId.BalanceAnalysis]: MentionIconName.BarChart,
  [MentionSectionTypeId.GameContext]: MentionIconName.Gamepad2,
}
