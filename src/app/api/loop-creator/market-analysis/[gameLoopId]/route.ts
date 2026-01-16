/**
 * Market Analysis API - CRUD operations
 *
 * GET /api/loop-creator/market-analysis/[gameLoopId] - Get saved analysis
 * POST /api/loop-creator/market-analysis/[gameLoopId] - Save new analysis
 * DELETE /api/loop-creator/market-analysis/[gameLoopId] - Delete and regenerate
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  marketAnalyses,
  marketAnalysisReferenceScores,
  marketAnalysisMarketSize,
  marketAnalysisAudienceFit,
  marketAnalysisCompetitors,
  marketAnalysisTrends,
  marketAnalysisPatterns,
  gameLoops,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { MarketAnalysisReport } from '@/domains/loop-creator/agents/market-analyst/types'

interface RouteParams {
  params: Promise<{ gameLoopId: string }>
}

/**
 * GET - Retrieve saved market analysis for a game loop
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { gameLoopId } = await params

    // Verify game loop exists
    const [gameLoop] = await db
      .select()
      .from(gameLoops)
      .where(eq(gameLoops.id, gameLoopId))
      .limit(1)

    if (!gameLoop) {
      return NextResponse.json({ error: 'Game loop not found' }, { status: 404 })
    }

    // Get the latest market analysis
    const [analysis] = await db
      .select()
      .from(marketAnalyses)
      .where(eq(marketAnalyses.gameLoopId, gameLoopId))
      .orderBy(marketAnalyses.createdAt)
      .limit(1)

    if (!analysis) {
      return NextResponse.json({ exists: false, analysis: null })
    }

    // Fetch all related data in parallel
    const [referenceScores, marketSize, audienceFit, competitors, trends, patterns] =
      await Promise.all([
        db
          .select()
          .from(marketAnalysisReferenceScores)
          .where(eq(marketAnalysisReferenceScores.marketAnalysisId, analysis.id))
          .limit(1),
        db
          .select()
          .from(marketAnalysisMarketSize)
          .where(eq(marketAnalysisMarketSize.marketAnalysisId, analysis.id))
          .limit(1),
        db
          .select()
          .from(marketAnalysisAudienceFit)
          .where(eq(marketAnalysisAudienceFit.marketAnalysisId, analysis.id))
          .limit(1),
        db
          .select()
          .from(marketAnalysisCompetitors)
          .where(eq(marketAnalysisCompetitors.marketAnalysisId, analysis.id)),
        db
          .select()
          .from(marketAnalysisTrends)
          .where(eq(marketAnalysisTrends.marketAnalysisId, analysis.id)),
        db
          .select()
          .from(marketAnalysisPatterns)
          .where(eq(marketAnalysisPatterns.marketAnalysisId, analysis.id)),
      ])

    // Reconstruct the report
    const report: MarketAnalysisReport = {
      referenceScores: referenceScores[0]
        ? {
            discoElysium: referenceScores[0].discoElysiumScore,
            vampireSurvivors: referenceScores[0].vampireSurvivorsScore,
            counterStrike: referenceScores[0].counterStrikeScore,
          }
        : { discoElysium: 0, vampireSurvivors: 0, counterStrike: 0 },

      marketSize: marketSize[0]
        ? {
            tam: marketSize[0].tam,
            sam: marketSize[0].sam,
            relevantSegment: marketSize[0].relevantSegment,
            growthRate: marketSize[0].growthRate,
            confidence: Number(marketSize[0].confidence),
            sources: marketSize[0].sources || [],
          }
        : { tam: '', sam: '', relevantSegment: '', growthRate: '', confidence: 0, sources: [] },

      audienceFit: audienceFit[0]
        ? {
            targetDemographic: audienceFit[0].targetDemographic,
            fitScore: audienceFit[0].fitScore,
            strengths: audienceFit[0].strengths || [],
            concerns: audienceFit[0].concerns || [],
            recommendations: audienceFit[0].recommendations || [],
          }
        : { targetDemographic: '', fitScore: 0, strengths: [], concerns: [], recommendations: [] },

      competitors: competitors.map(c => ({
        name: c.name,
        genre: c.genre,
        platform: c.platforms || [],
        playerCount: c.playerCount || undefined,
        similarityScore: c.similarityScore,
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || [],
        marketPosition: c.marketPosition || '',
      })),

      trends: trends.map(t => ({
        trend: t.trendName,
        direction: t.direction as 'rising' | 'stable' | 'declining',
        relevance: t.relevance,
        description: t.description,
        timeframe: t.timeframe || '',
      })),

      patterns: patterns.map(p => ({
        patternName: p.patternName,
        matchScore: p.matchScore,
        description: p.description,
        examples: p.examples || [],
        applicability: p.applicability || '',
      })),

      overallScore: analysis.overallScore,
      recommendations: analysis.recommendations || [],
      risks: analysis.risks || [],
      opportunities: analysis.opportunities || [],
      generatedAt: analysis.createdAt.toISOString(),
      sourcesUsed: analysis.sourcesUsed || [],
      confidence: Number(analysis.confidence),
    }

    return NextResponse.json({
      exists: true,
      analysis: report,
      metadata: {
        id: analysis.id,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching market analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analysis' },
      { status: 500 }
    )
  }
}

/**
 * POST - Save a new market analysis
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { gameLoopId } = await params

    // Verify game loop exists
    const [gameLoop] = await db
      .select()
      .from(gameLoops)
      .where(eq(gameLoops.id, gameLoopId))
      .limit(1)

    if (!gameLoop) {
      return NextResponse.json({ error: 'Game loop not found' }, { status: 404 })
    }

    const report: MarketAnalysisReport = await req.json()

    // Delete any existing analysis for this game loop
    const existing = await db
      .select({ id: marketAnalyses.id })
      .from(marketAnalyses)
      .where(eq(marketAnalyses.gameLoopId, gameLoopId))

    for (const e of existing) {
      await db.delete(marketAnalyses).where(eq(marketAnalyses.id, e.id))
    }

    // Insert main analysis record
    const [newAnalysis] = await db
      .insert(marketAnalyses)
      .values({
        gameLoopId,
        userId: user.id,
        overallScore: report.overallScore,
        confidence: String(report.confidence),
        recommendations: report.recommendations,
        risks: report.risks,
        opportunities: report.opportunities,
        sourcesUsed: report.sourcesUsed,
      })
      .returning()

    // Insert related records in parallel
    await Promise.all([
      // Reference scores
      db.insert(marketAnalysisReferenceScores).values({
        marketAnalysisId: newAnalysis.id,
        discoElysiumScore: report.referenceScores.discoElysium,
        vampireSurvivorsScore: report.referenceScores.vampireSurvivors,
        counterStrikeScore: report.referenceScores.counterStrike,
      }),

      // Market size
      db.insert(marketAnalysisMarketSize).values({
        marketAnalysisId: newAnalysis.id,
        tam: report.marketSize.tam,
        sam: report.marketSize.sam,
        relevantSegment: report.marketSize.relevantSegment,
        growthRate: report.marketSize.growthRate,
        confidence: String(report.marketSize.confidence),
        sources: report.marketSize.sources,
      }),

      // Audience fit
      db.insert(marketAnalysisAudienceFit).values({
        marketAnalysisId: newAnalysis.id,
        targetDemographic: report.audienceFit.targetDemographic,
        fitScore: report.audienceFit.fitScore,
        strengths: report.audienceFit.strengths,
        concerns: report.audienceFit.concerns,
        recommendations: report.audienceFit.recommendations,
      }),

      // Competitors
      report.competitors.length > 0
        ? db.insert(marketAnalysisCompetitors).values(
            report.competitors.map(c => ({
              marketAnalysisId: newAnalysis.id,
              name: c.name,
              genre: c.genre,
              platforms: c.platform,
              playerCount: c.playerCount,
              similarityScore: c.similarityScore,
              strengths: c.strengths,
              weaknesses: c.weaknesses,
              marketPosition: c.marketPosition,
            }))
          )
        : Promise.resolve(),

      // Trends
      report.trends.length > 0
        ? db.insert(marketAnalysisTrends).values(
            report.trends.map(t => ({
              marketAnalysisId: newAnalysis.id,
              trendName: t.trend,
              direction: t.direction,
              relevance: t.relevance,
              description: t.description,
              timeframe: t.timeframe,
            }))
          )
        : Promise.resolve(),

      // Patterns
      report.patterns.length > 0
        ? db.insert(marketAnalysisPatterns).values(
            report.patterns.map(p => ({
              marketAnalysisId: newAnalysis.id,
              patternName: p.patternName,
              matchScore: p.matchScore,
              description: p.description,
              examples: p.examples,
              applicability: p.applicability,
            }))
          )
        : Promise.resolve(),
    ])

    return NextResponse.json({
      success: true,
      id: newAnalysis.id,
      createdAt: newAnalysis.createdAt,
    })
  } catch (error) {
    console.error('Error saving market analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save analysis' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete saved market analysis (to allow regeneration)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { gameLoopId } = await params

    // Verify game loop exists
    const [gameLoop] = await db
      .select()
      .from(gameLoops)
      .where(eq(gameLoops.id, gameLoopId))
      .limit(1)

    if (!gameLoop) {
      return NextResponse.json({ error: 'Game loop not found' }, { status: 404 })
    }

    // Delete all analyses for this game loop (cascades to related tables)
    await db.delete(marketAnalyses).where(eq(marketAnalyses.gameLoopId, gameLoopId))

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    console.error('Error deleting market analysis:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete analysis' },
      { status: 500 }
    )
  }
}
