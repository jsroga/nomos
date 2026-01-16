export const config = {
  API_URL: process.env.API_URL || 'http://localhost:3000/api/storyteller/chat/stream',
  // Default test project/episode - can be overridden by env vars
  // Using the project from recent user testing
  TEST_PROJECT_ID: process.env.TEST_PROJECT_ID || '0696e553-d361-4a36-a839-fb9c5e570e75',
  TEST_EPISODE_ID: process.env.TEST_EPISODE_ID || '',

  // LangSmith
  LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2 || 'true',
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
}
