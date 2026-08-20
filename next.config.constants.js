/** Wire values for `next.config.js` (root config — keep magic strings out of the config file). */

const THREE = 'three'
const MOTION = 'motion'
const REACT_MARKDOWN = 'react-markdown'
const REMARK_GFM = 'remark-gfm'
const LUCIDE_REACT = 'lucide-react'
const LODASH = 'lodash'
const ZUSTAND = 'zustand'
const ASYNC_HOOKS = 'async_hooks'
const FFMPEG_STATIC = 'ffmpeg-static'
const FFPROBE_STATIC = 'ffprobe-static'

const TRANSPILE_PACKAGES = [
  '@react-three/fiber',
  '@react-three/drei',
  '@react-three/postprocessing',
  THREE,
  '@radix-ui/react-alert-dialog',
  '@radix-ui/react-avatar',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-scroll-area',
  '@radix-ui/react-slider',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  '@xyflow/react',
  MOTION,
  '@scalar/api-reference-react',
  REACT_MARKDOWN,
  REMARK_GFM,
]

const OPTIMIZE_PACKAGE_IMPORTS = [
  LUCIDE_REACT,
  LODASH,
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-tabs',
  '@tanstack/react-query',
  MOTION,
  ZUSTAND,
]

const SERVER_EXTERNAL_PACKAGES = [
  ASYNC_HOOKS,
  '@opentelemetry/api',
  '@opentelemetry/resources',
  '@opentelemetry/sdk-node',
  '@opentelemetry/sdk-trace-node',
  '@opentelemetry/sdk-trace-base',
  '@langchain/core',
  '@langchain/openai',
  '@mastra/core',
  '@mastra/libsql',
  '@mastra/loggers',
  '@mastra/mcp',
  '@mastra/memory',
  '@mastra/observability',
  '@mastra/pg',
  FFMPEG_STATIC,
  FFPROBE_STATIC,
]

const CONSOLE_ERROR = 'error'
const CONSOLE_WARN = 'warn'
const REMOVE_CONSOLE_EXCLUDE = [CONSOLE_ERROR, CONSOLE_WARN]

const DEV_INDICATOR_POSITION = 'bottom-right'
const SSR_SELF_GLOBAL = 'globalThis'
const PRODUCTION_NODE_ENV = 'production'
const ANALYZE_ENV_ENABLED = 'true'
const SENTRY_ORG = 'kurvitza'
const SENTRY_PROJECT = 'sentry-coquelicot-basket'

module.exports = {
  LODASH_PACKAGE: LODASH,
  TRANSPILE_PACKAGES,
  OPTIMIZE_PACKAGE_IMPORTS,
  SERVER_EXTERNAL_PACKAGES,
  ASYNC_HOOKS_MODULE: ASYNC_HOOKS,
  DEV_INDICATOR_POSITION,
  SSR_SELF_GLOBAL,
  PRODUCTION_NODE_ENV,
  ANALYZE_ENV_ENABLED,
  REMOVE_CONSOLE_EXCLUDE,
  SENTRY_ORG,
  SENTRY_PROJECT,
}
