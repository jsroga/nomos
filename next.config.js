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
    '@langchain/langgraph',
    '@langchain/anthropic',
    '@langchain/openai',
    '@langchain/langgraph-checkpoint-postgres',
  ],
  devIndicators: {
    position: 'bottom-right',
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
    } else {
      // Production optimizations
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks for better caching
            default: false,
            vendors: false,
            // Three.js and related packages
            three: {
              name: 'three',
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // LangChain packages (if used client-side)
            langchain: {
              name: 'langchain',
              test: /[\\/]node_modules[\\/]@langchain[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            // Radix UI components
            radix: {
              name: 'radix',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              priority: 10,
              reuseExistingChunk: true,
            },
            // Common vendor libraries
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
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
