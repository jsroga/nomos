import { config } from './config';

export interface TestResult {
  success: boolean;
  message: string;
  traceUrl?: string;
  logs: string[];
}

export class StorytellerTestRunner {
  private logs: string[] = [];

  log(msg: string) {
    console.log(`[TEST] ${msg}`);
    this.logs.push(msg);
  }

  async runChat(message: string, projectId = config.TEST_PROJECT_ID, episodeId = config.TEST_EPISODE_ID) {
    this.log(`Sending message: "${message}" to Project: ${projectId}, Episode: ${episodeId}`);

    try {
      const response = await fetch(config.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          projectId,
          episodeId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      // The API returns a stream, but for E2E testing we might just want to capture the chunks
      // Since this is a test, we'll read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunks: any[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          // Try to parse SSE-like chunks if possible, or just raw text
          // Our API might be returning raw text or SSE events. 
          // Assuming standard stream text for now, but capturing for analysis.
          chunks.push(chunk);
        }
      }

      this.log(`Response received (${fullResponse.length} chars)`);
      return { fullResponse, chunks };

    } catch (error) {
      this.log(`Error: ${error}`);
      throw error;
    }
  }

  // Assertions
  expectDelegation(response: string, agentName: string) {
    // We need to look for clues in the response that delegation happened.
    // Since the stream outputs text to the user, we might not see the internal "nextAgent" JSON 
    // unless the API is returning that metadata.
    // However, the "Showrunner" usually narrates: "Delegating to..."
    
    const delegationPatterns = [
        `Delegating to ${agentName}`,
        `${agentName},`,
        `consult the ${agentName}`,
        `Let's have the ${agentName}`
    ];
    
    const hasDelegation = delegationPatterns.some(p => response.includes(p)) || 
                          response.toLowerCase().includes(agentName.toLowerCase());

    if (!hasDelegation) {
        throw new Error(`Expected delegation to ${agentName}, but didn't find clear evidence in response.`);
    }
    this.log(`✅ Verified delegation to ${agentName}`);
  }
}


