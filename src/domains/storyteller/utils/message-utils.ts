import { BaseMessage, AIMessage, ToolMessage } from '@langchain/core/messages'

/**
 * Extract a readable message from LLM response content.
 * If the content is JSON with a 'message' field, extracts that.
 * Otherwise returns the content as-is.
 */
export function extractReadableMessage(content: string | object): string {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
  
  try {
    // Try to parse as JSON
    let jsonStr = contentStr
    
    // Handle markdown code blocks
    const jsonMatch = contentStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }
    
    const parsed = JSON.parse(jsonStr)
    
    // Extract message field if present
    if (parsed.message && typeof parsed.message === 'string') {
      return parsed.message
    }
    
    // If it's a structured response with other readable fields, format them
    if (parsed.verdict) {
      return `**${parsed.verdict}**: ${parsed.message || parsed.objection || 'No additional details'}`
    }
    
    // Return original if no message field
    return contentStr
  } catch {
    // Not JSON, return as-is
    return contentStr
  }
}

/**
 * Get a safe slice of message history that doesn't break tool call chains.
 * Ensures that if a ToolMessage is included, its preceding AIMessage (with tool_calls) is also included.
 * 
 * @param messages The full message history
 * @param count Number of messages to try to include (default 5)
 */
export function getSafeMessageHistory(messages: BaseMessage[], count: number = 5): BaseMessage[] {
  if (messages.length <= count) return messages

  // Initial slice
  let slice = messages.slice(-count)

  // Check if the first message is a ToolMessage
  // If so, we need to look back for the AIMessage that triggered it
  while (slice.length > 0 && slice[0] instanceof ToolMessage) {
    // Find the index of this message in the original array
    const firstMsg = slice[0]
    const originalIndex = messages.indexOf(firstMsg)
    
    if (originalIndex > 0) {
      // Include the message before it (likely the AIMessage with tool_calls)
      const prevMsg = messages[originalIndex - 1]
      slice.unshift(prevMsg)
      
      // If the message we just added is ALSO a ToolMessage (unlikely but possible in chains), loop continues
      // If it's an AIMessage, we check if it has other tool calls that need satisfying? 
      // Usually AIMessage -> [ToolMessage, ToolMessage] is the pattern.
      // If we grabbed the AIMessage, we are good.
    } else {
      // Orphaned tool message at start of history? Drop it to be safe.
      slice.shift()
    }
  }

  // Edge case: If we grabbed an AIMessage that has tool_calls, but we didn't grab ALL its tool responses?
  // LangChain usually handles partial history fine as long as the chain isn't broken *in the middle*.
  // i.e. AI(tool_calls) -> ... must eventually be closed.
  
  return slice
}








