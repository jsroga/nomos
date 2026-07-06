/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile heavy packages for faster builds and proper bundling
  transpilePackages: [
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/postprocessing',
    'three',
    // Heavy UI libraries that benefit from pre-transpilation
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-avatar',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-slider',
    '@radix-ui/react-tabs',
    '@radix-ui/react-tooltip',
    // Large visualization libraries
    'mermaid',
    'recharts',
    '@xyflow/react',
    // Animation libraries
    'framer-motion',
    'motion',
    // Other heavy dependencies
    '@scalar/api-reference-react',
    'react-markdown',
    'remark-gfm',
  ],
  // Optimize package imports for better tree-shaking and faster builds
  modularizeImports: {
    'lodash': {
      transform: 'lodash/{{member}}',
      skipDefaultConversion: true,
    },
  },
  // Optimize specific package imports (Next.js 15 feature)
  experimental: {
    reactCompiler: true,
    optimizePackageImports: [
      'lucide-react',
      'lodash',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@tanstack/react-query',
      'framer-motion',
      'zustand',
    ],
  },
  // Ignore ESLint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build to prevent memory issues
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mark async_hooks and OpenTelemetry as external to prevent bundling errors
  serverExternalPackages: [
    'async_hooks',
    '@opentelemetry/api',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-node',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/sdk-trace-base',
    // LangChain packages are better kept external (server-only)
    '@langchain/core',
    '@langchain/anthropic',
    '@langchain/openai',
    // Mastra packages are server-only
    '@mastra/core',
    '@mastra/langfuse',
    '@mastra/libsql',
    '@mastra/loggers',
    '@mastra/mcp',
    '@mastra/memory',
    '@mastra/observability',
    '@mastra/pg',
  ],
  devIndicators: {
    position: 'bottom-right',
  },
  async redirects() {
    return [
      { source: '/app', destination: '/projects', permanent: true },
      { source: '/app/:path*', destination: '/:path*', permanent: true },
    ]
  },
  // Optimize webpack configuration for faster builds
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Don't bundle async_hooks on client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      }
    }

    if (isServer) {
      // Some browser-targeting packages (formdata-polyfill, web-streams-polyfill, etc.)
      // reference 'self' as a browser global. Polyfill it for SSR.
      const { DefinePlugin } = require('webpack')
      config.plugins.push(new DefinePlugin({ self: 'globalThis' }))
    }

    // Optimize build performance
    if (dev) {
      // Faster rebuilds in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }
    }

    return config
  },
  // Compiler options for better performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
}

module.exports = nextConfig


// Injected content via Sentry wizard below

const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'kurvitza',
  project: 'sentry-coquelicot-basket',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
