import { webSearchTool } from './tools/web-search'
import { steamChartsTool } from './tools/steam-charts'
import { gameDatabaseTool } from './tools/game-database'
import { patternMatcherTool } from './tools/pattern-matcher'
import { discoElysiumScorerTool } from './tools/scorers/disco-elysium'
import { vampireSurvivorsScorerTool } from './tools/scorers/vampire-survivors'
import { counterStrikeScorerTool } from './tools/scorers/counter-strike'
import { bestMatchScorerTool } from './tools/scorers/best-match'
import { marketSizeEstimatorTool } from './tools/market-size'
import { audienceAnalyzerTool } from './tools/audience-analyzer'
import { competitorFinderTool } from './tools/competitor-finder'
import { trendAnalyzerTool } from './tools/trend-analyzer'
import { metricsPlannerTool } from './tools/metrics-planner'
import { reportGeneratorTool } from './tools/report-generator'
import { twitterTrendsTool } from './tools/twitter-trends'
import { steamTrendingTool } from './tools/steam-trending'
import { redditPulseTool } from './tools/reddit-pulse'
import { marketMomentumTool } from './tools/market-momentum'

export const marketAnalystTools = [
  webSearchTool,
  steamChartsTool,
  gameDatabaseTool,
  marketMomentumTool,
  twitterTrendsTool,
  steamTrendingTool,
  redditPulseTool,
  patternMatcherTool,
  competitorFinderTool,
  metricsPlannerTool,
  audienceAnalyzerTool,
  trendAnalyzerTool,
  marketSizeEstimatorTool,
  bestMatchScorerTool,
  discoElysiumScorerTool,
  vampireSurvivorsScorerTool,
  counterStrikeScorerTool,
  reportGeneratorTool,
]
