/**
 * Market Analyst Tools Index
 *
 * Re-exports all tools for easy import.
 */

// Core search and data tools
export { webSearchTool } from './web-search'
export { steamChartsTool } from './steam-charts'
export { gameDatabaseTool, getGenreInfo } from './game-database'
export { patternMatcherTool } from './pattern-matcher'

// Reference game scorers
export { discoElysiumScorerTool } from './scorers/disco-elysium'
export { vampireSurvivorsScorerTool } from './scorers/vampire-survivors'
export { counterStrikeScorerTool } from './scorers/counter-strike'
export { bestMatchScorerTool } from './scorers/best-match'
export type { ArchetypeMatch, BestMatchResult, ArchetypeId } from './scorers/best-match'

// Market analysis tools
export { marketSizeEstimatorTool } from './market-size'
export { audienceAnalyzerTool } from './audience-analyzer'
export { competitorFinderTool } from './competitor-finder'
export { trendAnalyzerTool } from './trend-analyzer'
export { metricsPlannerTool, METRIC_DATABASE, GENRE_METRIC_PRIORITIES } from './metrics-planner'
export { reportGeneratorTool, formatReportForDisplay } from './report-generator'

// Real-time market signal tools
export { twitterTrendsTool } from './twitter-trends'
export type { TwitterTrendResult } from './twitter-trends'
export { steamTrendingTool } from './steam-trending'
export type { SteamGameData, GenreMarketData } from './steam-trending'
export { redditPulseTool } from './reddit-pulse'
export type { RedditPost, SubredditPulse } from './reddit-pulse'
export { marketMomentumTool } from './market-momentum'
export type { GenreMomentum, SocialBuzz, RisingCompetitor } from './market-momentum'
