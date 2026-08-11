import {
  Bot,
  Brain,
  Cpu,
  Layout,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  LoopAgentBgClass,
  LoopAgentTextClass,
  LoopCreatorAgentKey,
} from './loop-creator-layout'

export const LOOP_AGENT_CONFIG = {
  [LoopCreatorAgentKey.System]: {
    color: LoopAgentTextClass.Muted,
    bgColor: LoopAgentBgClass.System,
    icon: <Bot className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.Supervisor]: {
    color: LoopAgentTextClass.Blue,
    bgColor: LoopAgentBgClass.Blue,
    icon: <Brain className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.LoopPlanner]: {
    color: LoopAgentTextClass.Purple,
    bgColor: LoopAgentBgClass.Purple,
    icon: <Layout className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.MechanicsDesigner]: {
    color: LoopAgentTextClass.Emerald,
    bgColor: LoopAgentBgClass.Emerald,
    icon: <Cpu className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.BalanceAnalyst]: {
    color: LoopAgentTextClass.Amber,
    bgColor: LoopAgentBgClass.Amber,
    icon: <Scale className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.ProgressionArchitect]: {
    color: LoopAgentTextClass.Rose,
    bgColor: LoopAgentBgClass.Rose,
    icon: <TrendingUp className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.MarketAnalyst]: {
    color: LoopAgentTextClass.Indigo,
    bgColor: LoopAgentBgClass.Indigo,
    icon: <Search className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.LoopAssistant]: {
    color: LoopAgentTextClass.Purple,
    bgColor: LoopAgentBgClass.Purple,
    icon: <Sparkles className="w-4 h-4" />,
  },
  [LoopCreatorAgentKey.User]: {
    color: LoopAgentTextClass.Foreground,
    bgColor: LoopAgentBgClass.Card,
    icon: <Bot className="w-4 h-4" />,
  },
}
