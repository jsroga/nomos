export async function register() {
  // Only attempt to load OTel in production on Vercel
  if (process.env.VERCEL && process.env.NODE_ENV === 'production') {
    try {
      const { registerOTel } = await import('@vercel/otel')
      registerOTel({ serviceName: 'kur' })
    } catch {
      // Module not available - skip silently
    }
  }
}
