export const config = {
  API_URL: process.env.API_URL || 'http://localhost:3000/api/storyteller/chat/stream',
  // Default test project/episode - can be overridden by env vars
  TEST_PROJECT_ID: process.env.TEST_PROJECT_ID || '01c5deda-c654-4576-89f9-860ff545f2dd',
  TEST_EPISODE_ID: process.env.TEST_EPISODE_ID || 'f8722286-25b7-4d83-bd85-6cbac61be361',
  
  // LangSmith
  LANGCHAIN_TRACING_V2: process.env.LANGCHAIN_TRACING_V2 || 'true',
  LANGCHAIN_API_KEY: process.env.LANGCHAIN_API_KEY,
};





