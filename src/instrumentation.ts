export async function register() {
  // Only run on Node.js server runtime (not Edge or browser)
  if (typeof globalThis.process === 'undefined' || typeof globalThis.process.versions?.node === 'undefined') {
    return
  }

  // Patch Mastra's default serialization limits BEFORE any Mastra modules load
  // This prevents context truncation in Langfuse (default maxTotalChars: 8192 is too small)
  // 
  // IMPORTANT: This uses a different approach since direct import of @mastra/core/ai-tracing
  // causes module resolution issues (crypto not found in client bundle)
  try {
    // Set environment variables that Mastra's internal serialization reads
    // These override the hardcoded DEFAULT_SERIALIZATION_LIMITS
    process.env.MASTRA_SERIALIZATION_MAX_ATTR_CHARS = '100000'
    process.env.MASTRA_SERIALIZATION_MAX_DEPTH = '20'
    process.env.MASTRA_SERIALIZATION_MAX_KEYS = '500'
    process.env.MASTRA_SERIALIZATION_MAX_ARRAY_ITEMS = '500'
    process.env.MASTRA_SERIALIZATION_MAX_TOTAL_CHARS = '1000000'
    
    console.log('✅ Mastra serialization limits configured via env (no truncation)')
  } catch (e) {
    console.warn('⚠️ Could not configure Mastra serialization limits:', e)
  }

  // Configure Langfuse OTLP endpoint if credentials exist
  // Langfuse expects traces at: https://cloud.langfuse.com/api/public/otel/v1/traces
  const langfuseHost = process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com'
  const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY
  const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY

  if (langfusePublicKey && langfuseSecretKey) {
    // Set OTLP endpoint for Langfuse if not already set
    if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = `${langfuseHost}/api/public/otel`
    }

    // Set auth header for OTLP exporter (Basic auth with publicKey:secretKey)
    const authHeader = Buffer.from(`${langfusePublicKey}:${langfuseSecretKey}`).toString('base64')
    if (!process.env.OTEL_EXPORTER_OTLP_HEADERS) {
      process.env.OTEL_EXPORTER_OTLP_HEADERS = `Authorization=Basic ${authHeader}`
    }

    console.log('✅ Langfuse OTLP configured:', langfuseHost)
  }

  // Register OpenTelemetry with @vercel/otel
  try {
    const { registerOTel } = await import('@vercel/otel')
    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME || 'tilemap-storyteller',
      // Vercel OTEL will use OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS
    })
    console.log('✅ OpenTelemetry Registered')
  } catch (err) {
    console.error('❌ Failed to register OpenTelemetry:', err)
  }
}
