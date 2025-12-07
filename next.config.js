/** @type {import('next').NextConfig} */
const nextConfig = {
    // Transpile @react-three packages for proper bundling
    transpilePackages: [
        '@react-three/fiber',
        '@react-three/drei',
        '@react-three/postprocessing',
        'three',
    ],
    // Mark async_hooks as external to prevent client-side bundling errors
    serverExternalPackages: ['async_hooks'],
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
