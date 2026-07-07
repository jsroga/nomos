export async function register() {
  // Only run on Node.js server runtime (not Edge or browser)
  if (
    typeof globalThis.process === 'undefined' ||
    typeof globalThis.process.versions?.node === 'undefined'
  ) {
    return
  }

  // Patch Mastra's default serialization limits BEFORE any Mastra modules load
  // (default maxTotalChars: 8192 is too small for large agent context)
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

  // Register OpenTelemetry with @vercel/otel (Mastra Observability uses Mastra storage exporters)
  try {
    const otelStart = performance.now()
    const { registerOTel } = await import('@vercel/otel')
    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME || 'tilemap-storyteller',
      // Vercel OTEL will use OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_EXPORTER_OTLP_HEADERS
    })
    console.log(`✅ OpenTelemetry Registered in ${(performance.now() - otelStart).toFixed(2)}ms`)
  } catch (err) {
    console.error('❌ Failed to register OpenTelemetry:', err)
  }
}
