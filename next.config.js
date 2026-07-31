/** @type {import('next').NextConfig} */
const path = require('path')
const {
  LODASH_PACKAGE,
  TRANSPILE_PACKAGES,
  OPTIMIZE_PACKAGE_IMPORTS,
  SERVER_EXTERNAL_PACKAGES,
  DEV_INDICATOR_POSITION,
  SSR_SELF_GLOBAL,
  PRODUCTION_NODE_ENV,
  REMOVE_CONSOLE_EXCLUDE,
  SENTRY_ORG,
  SENTRY_PROJECT,
} = require('./next.config.constants')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === '1',
})

const nextConfig = {
  // Transpile heavy packages for faster builds and proper bundling
  transpilePackages: TRANSPILE_PACKAGES,
  // Optimize package imports for better tree-shaking and faster builds
  modularizeImports: {
    [LODASH_PACKAGE]: {
      transform: 'lodash/{{member}}',
      skipDefaultConversion: true,
    },
  },
  // Next.js 16: reactCompiler is stable (was experimental in 15)
  reactCompiler: true,
  experimental: {
    optimizePackageImports: OPTIMIZE_PACKAGE_IMPORTS,
  },
  // Turbopack (default in Next 16). Pin root so get_next_package resolves
  // node_modules/next correctly (avoids "Next.js package not found" panics).
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      async_hooks: { browser: './empty-module.js' },
    },
  },
  // Ship file-based agent instructions (src/mastra/agents/**/instructions.md)
  // with the serverless output so runtime fs reads resolve in production.
  outputFileTracingIncludes: {
    '/**': ['./src/mastra/agents/**/*.md'],
  },
  // Ignore TypeScript errors during build to prevent memory issues
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mark async_hooks and OpenTelemetry as external to prevent bundling errors
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  devIndicators: {
    position: DEV_INDICATOR_POSITION,
  },
  async redirects() {
    return [
      { source: '/app', destination: '/projects', permanent: true },
      { source: '/app/:path*', destination: '/:path*', permanent: true },
    ]
  },
  // Used when building/dev with --webpack (Sentry plugin + Node polyfills).
  // Default `next build` / `next dev` use Turbopack and ignore this block.
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
      config.plugins.push(new DefinePlugin({ self: SSR_SELF_GLOBAL }))
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
    removeConsole: process.env.NODE_ENV === PRODUCTION_NODE_ENV ? {
      exclude: REMOVE_CONSOLE_EXCLUDE,
    } : false,
  },
}

module.exports = nextConfig


// Injected content via Sentry wizard below

const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withBundleAnalyzer(withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: SENTRY_ORG,
  project: SENTRY_PROJECT,

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
}))
