/**
 * Feedback Service
 * 
 * Collects and processes user feedback on agent outputs.
 * Automatically:
 * - Stores feedback in RAG for future reference
 * - Adds to evaluation dataset
 * - Tracks patterns for prompt improvements
 */

import { v4 as uuidv4 } from 'uuid'
import { ragService } from './rag-service'
import { db } from '@/lib/db'

// ============================================
// TYPES
// ============================================

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'correction'
export type FeedbackCategory = 'hallucination' | 'inconsistency' | 'quality' | 'slop' | 'other'

export interface UserFeedback {
  id: string
  runId: string  // LangSmith run ID for tracing
  projectId: string
  episodeId?: string
  
  type: FeedbackType
  category: FeedbackCategory
  
  originalOutput: string
  correctedOutput?: string
  userComment?: string
  
  agentName?: string
  messageIndex?: number
  
  timestamp: Date
  processed: boolean
}

export interface FeedbackStats {
  totalFeedback: number
  thumbsUp: number
  thumbsDown: number
  corrections: number
  byCategory: Record<FeedbackCategory, number>
  byAgent: Record<string, { positive: number; negative: number }>
}

export interface FeedbackPattern {
  category: FeedbackCategory
  count: number
  examples: string[]
  suggestedFix?: string
}

// ============================================
// IN-MEMORY STORAGE (replace with DB in production)
// ============================================

// TODO: Replace with proper DB table
const feedbackStore = new Map<string, UserFeedback>()
const feedbackByProject = new Map<string, string[]>()  // projectId -> feedbackIds

// ============================================
// FEEDBACK SERVICE
// ============================================

export class FeedbackService {
  /**
   * Submit user feedback on an output
   */
  async submitFeedback(params: {
    runId: string
    projectId: string
    episodeId?: string
    type: FeedbackType
    category: FeedbackCategory
    originalOutput: string
    correctedOutput?: string
    userComment?: string
    agentName?: string
    messageIndex?: number
  }): Promise<UserFeedback> {
    const feedback: UserFeedback = {
      id: uuidv4(),
      runId: params.runId,
      projectId: params.projectId,
      episodeId: params.episodeId,
      type: params.type,
      category: params.category,
      originalOutput: params.originalOutput,
      correctedOutput: params.correctedOutput,
      userComment: params.userComment,
      agentName: params.agentName,
      messageIndex: params.messageIndex,
      timestamp: new Date(),
      processed: false,
    }
    
    // Store feedback
    feedbackStore.set(feedback.id, feedback)
    
    // Index by project
    const projectFeedback = feedbackByProject.get(params.projectId) || []
    projectFeedback.push(feedback.id)
    feedbackByProject.set(params.projectId, projectFeedback)
    
    // Process feedback asynchronously
    this.processFeedback(feedback).catch(err => {
      console.error('[Feedback] Processing failed:', err)
    })
    
    console.log(`[Feedback] Submitted: ${feedback.type} for ${feedback.agentName || 'unknown'} (${feedback.category})`)
    
    return feedback
  }
  
  /**
   * Process feedback - store in RAG, update datasets
   */
  private async processFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // 1. Store in RAG for future reference
      await this.storeInRAG(feedback)
      
      // 2. Update LangSmith dataset (if correction)
      if (feedback.type === 'correction' && feedback.correctedOutput) {
        await this.addToEvaluationDataset(feedback)
      }
      
      // 3. Update patterns
      await this.updatePatterns(feedback)
      
      // Mark as processed
      feedback.processed = true
      feedbackStore.set(feedback.id, feedback)
      
    } catch (error) {
      console.error('[Feedback] Processing error:', error)
    }
  }
  
  /**
   * Store feedback in RAG for future agent reference
   */
  private async storeInRAG(feedback: UserFeedback): Promise<void> {
    const content = this.formatFeedbackForRAG(feedback)
    
    await ragService.storeUserFeedback(
      feedback.projectId,
      content,
      `Agent: ${feedback.agentName || 'unknown'}, Category: ${feedback.category}`
    )
  }
  
  /**
   * Format feedback for RAG storage
   */
  private formatFeedbackForRAG(feedback: UserFeedback): string {
    const parts = [
      `Feedback Type: ${feedback.type.toUpperCase()}`,
      `Category: ${feedback.category}`,
      feedback.agentName ? `Agent: ${feedback.agentName}` : '',
      `Original Output: "${feedback.originalOutput.slice(0, 500)}${feedback.originalOutput.length > 500 ? '...' : ''}"`,
      feedback.correctedOutput ? `Correction: "${feedback.correctedOutput.slice(0, 500)}${feedback.correctedOutput.length > 500 ? '...' : ''}"` : '',
      feedback.userComment ? `User Comment: ${feedback.userComment}` : '',
    ].filter(Boolean)
    
    return parts.join('\n')
  }
  
  /**
   * Add correction to LangSmith evaluation dataset
   */
  private async addToEvaluationDataset(feedback: UserFeedback): Promise<void> {
    // This would require LangSmith SDK to add to dataset
    // For now, log for manual addition
    console.log('[Feedback] Correction available for dataset:')
    console.log(`  Project: ${feedback.projectId}`)
    console.log(`  Agent: ${feedback.agentName}`)
    console.log(`  Category: ${feedback.category}`)
    
    // TODO: Implement LangSmith dataset update
    // const client = new Client({ apiKey: process.env.LANGCHAIN_API_KEY })
    // await client.createExample({
    //   datasetName: 'storyteller-corrections',
    //   inputs: { originalOutput: feedback.originalOutput },
    //   outputs: { correctedOutput: feedback.correctedOutput },
    // })
  }
  
  /**
   * Update pattern tracking
   */
  private async updatePatterns(feedback: UserFeedback): Promise<void> {
    // Track patterns for prompt improvement
    // This would be more sophisticated in production
    console.log(`[Feedback] Pattern tracked: ${feedback.category} from ${feedback.agentName}`)
  }
  
  /**
   * Get feedback for a project
   */
  async getProjectFeedback(projectId: string): Promise<UserFeedback[]> {
    const ids = feedbackByProject.get(projectId) || []
    return ids.map(id => feedbackStore.get(id)).filter(Boolean) as UserFeedback[]
  }
  
  /**
   * Get feedback stats for a project
   */
  async getProjectStats(projectId: string): Promise<FeedbackStats> {
    const feedback = await this.getProjectFeedback(projectId)
    
    const stats: FeedbackStats = {
      totalFeedback: feedback.length,
      thumbsUp: feedback.filter(f => f.type === 'thumbs_up').length,
      thumbsDown: feedback.filter(f => f.type === 'thumbs_down').length,
      corrections: feedback.filter(f => f.type === 'correction').length,
      byCategory: {
        hallucination: 0,
        inconsistency: 0,
        quality: 0,
        slop: 0,
        other: 0,
      },
      byAgent: {},
    }
    
    for (const f of feedback) {
      // By category
      stats.byCategory[f.category]++
      
      // By agent
      const agentName = f.agentName || 'unknown'
      if (!stats.byAgent[agentName]) {
        stats.byAgent[agentName] = { positive: 0, negative: 0 }
      }
      if (f.type === 'thumbs_up') {
        stats.byAgent[agentName].positive++
      } else {
        stats.byAgent[agentName].negative++
      }
    }
    
    return stats
  }
  
  /**
   * Get patterns from feedback for prompt improvement
   */
  async getPatterns(projectId?: string): Promise<FeedbackPattern[]> {
    const feedback = projectId 
      ? await this.getProjectFeedback(projectId)
      : Array.from(feedbackStore.values())
    
    // Group negative feedback by category
    const negativeByCategory: Record<FeedbackCategory, UserFeedback[]> = {
      hallucination: [],
      inconsistency: [],
      quality: [],
      slop: [],
      other: [],
    }
    
    for (const f of feedback) {
      if (f.type !== 'thumbs_up') {
        negativeByCategory[f.category].push(f)
      }
    }
    
    // Build patterns
    const patterns: FeedbackPattern[] = []
    
    for (const [category, items] of Object.entries(negativeByCategory)) {
      if (items.length >= 2) {  // Only report if pattern occurs multiple times
        patterns.push({
          category: category as FeedbackCategory,
          count: items.length,
          examples: items.slice(0, 3).map(f => 
            f.originalOutput.slice(0, 100) + (f.originalOutput.length > 100 ? '...' : '')
          ),
          suggestedFix: this.getSuggestedFix(category as FeedbackCategory),
        })
      }
    }
    
    return patterns.sort((a, b) => b.count - a.count)
  }
  
  /**
   * Get suggested fix for a category
   */
  private getSuggestedFix(category: FeedbackCategory): string {
    const fixes: Record<FeedbackCategory, string> = {
      hallucination: 'Strengthen RAG grounding, add citation requirements, enable URL validation',
      inconsistency: 'Increase series bible retrieval, add consistency validators',
      quality: 'Review prompts for clarity, add more specific examples',
      slop: 'Lower anti-slop threshold, add more slop patterns to detection',
      other: 'Review specific examples for common themes',
    }
    
    return fixes[category]
  }
  
  /**
   * Get satisfaction rate for a project or overall
   */
  async getSatisfactionRate(projectId?: string): Promise<number> {
    const feedback = projectId 
      ? await this.getProjectFeedback(projectId)
      : Array.from(feedbackStore.values())
    
    if (feedback.length === 0) return 0
    
    const positive = feedback.filter(f => f.type === 'thumbs_up').length
    return positive / feedback.length
  }
}

// ============================================
// SINGLETON
// ============================================

export const feedbackService = new FeedbackService()

