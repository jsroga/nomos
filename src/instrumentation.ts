export async function register() {
  // Only register OTel in production or if the module is available
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_OTEL === 'true') {
    try {
      const { registerOTel } = await import('@vercel/otel')
      registerOTel({
        serviceName: 'kurtvitza',
        // Traces will be sent to the configured exporter
        // Configure OTEL_EXPORTER_OTLP_ENDPOINT in your environment
        // For Grafana Cloud: https://otlp-gateway-prod-xx.grafana.net/otlp
      })
    } catch (e) {
      // @vercel/otel not available - skip telemetry
      console.log('OpenTelemetry not configured (module not available)')
    }
  }
}
