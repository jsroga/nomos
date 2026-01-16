import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({
    serviceName: 'kurtvitza',
    // Traces will be sent to the configured exporter
    // Configure OTEL_EXPORTER_OTLP_ENDPOINT in your environment
    // For Grafana Cloud: https://otlp-gateway-prod-xx.grafana.net/otlp
  })
}
