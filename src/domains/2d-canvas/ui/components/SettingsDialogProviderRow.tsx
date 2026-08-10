import { Check } from 'lucide-react'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import type { ProviderTestResult } from '@/domains/2d-canvas/core/io/settings.api'

export const ConnectionDot = ({ connected, label }: { connected: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border w-full">
    <div
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        connected ? 'bg-green-500' : 'bg-red-500'
      )}
    />
    <span className="text-muted-foreground">{label}</span>
    {connected && <Check className="w-3 h-3 text-green-500 ml-auto shrink-0" />}
  </div>
)

interface ProviderTestRowProps {
  connected: boolean
  label: string
  result?: ProviderTestResult
  testing: boolean
  onTest: () => void
}

export const TestableProviderRow = ({
  connected,
  label,
  result,
  testing,
  onTest,
}: ProviderTestRowProps) => (
  <div className="flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border w-full">
    <div
      className={cn(
        'w-2 h-2 rounded-full shrink-0',
        !connected
          ? 'bg-red-500'
          : result
            ? result.ok
              ? 'bg-green-500'
              : 'bg-red-500'
            : 'bg-yellow-500'
      )}
    />
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto flex items-center gap-2 shrink-0">
      {result?.ok && (
        <span className="text-green-500" title={result.model}>
          {result.latencyMs}ms
        </span>
      )}
      {result && !result.ok && (
        <span className="text-red-400 max-w-36 truncate" title={result.error}>
          {result.error}
        </span>
      )}
      {!result && connected && <span className="text-yellow-500/80">untested</span>}
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2 text-[10px]"
        disabled={!connected || testing}
        onClick={onTest}
      >
        {testing ? 'Testing…' : 'Test'}
      </Button>
    </span>
  </div>
)
