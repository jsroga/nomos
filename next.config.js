/** @type {import('next').NextConfig} */
const nextConfig = {
    // Transpile @react-three packages for proper bundling
    transpilePackages: [
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
        'three',
    ],
    // Ignore ESLint errors during build
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Ignore TypeScript errors during build to prevent memory issues
    typescript: {
        ignoreBuildErrors: true,
    },
    // Mark async_hooks as external to prevent client-side bundling errors
    serverExternalPackages: ['async_hooks'],
    // Hide default dev indicators - we have our own error tracking
    devIndicators: {
        appIsrStatus: false,
        buildActivity: false,
        buildActivityPosition: 'bottom-right',
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            // Don't bundle async_hooks on client side
            config.resolve.fallback = {
                ...config.resolve.fallback,
                async_hooks: false,
            }
        }
        return config
    },
}

module.exports = nextConfig
