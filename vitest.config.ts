import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['dotenv/config'],
    env: {
      DOTENV_CONFIG_PATH: '.env.local',
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
