import dotenv from 'dotenv'
import path from 'path'
import { MCP_ENV_LOCAL_FILE } from './constants/env'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), MCP_ENV_LOCAL_FILE) })
