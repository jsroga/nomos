const DEFAULT_API_URL = 'http://localhost:3000/api/storyteller/chat/stream'
const DEFAULT_TEST_PROJECT_ID = '0696e553-d361-4a36-a839-fb9c5e570e75'

export const config = {
  API_URL: process.env.API_URL || DEFAULT_API_URL,
  // Default test project/episode - can be overridden by env vars
  TEST_PROJECT_ID: process.env.TEST_PROJECT_ID || DEFAULT_TEST_PROJECT_ID,
  TEST_EPISODE_ID: process.env.TEST_EPISODE_ID || '',
}
