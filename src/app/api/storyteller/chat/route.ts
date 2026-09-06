import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { handleStorytellerChatPost } from './chat-post-handler'

/**
 * Non-streaming chat endpoint.
 *
 * Response contract preserved from the legacy StorytellerWorkflow:
 * `{ messages, beatBoard, status, continuityIssues, traceId }`.
 */
export const POST = withAuth(
  async (req: NextRequest, { session }: AuthenticatedRequest): Promise<NextResponse> => {
    return handleStorytellerChatPost(req, session.user.id, session.user.email)
  }
)
