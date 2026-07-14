'use client'

/**
 * ModelSelector — header dropdown for picking the tenant's model choice
 * (in the storyteller, the AUTHOR model — Kimi/GLM, PLAN-V2 1.4 lockdown).
 *
 * Platform component: the model list arrives as a prop (D7 — chat is
 * platform, domains are tenants; no domain catalog import here). Models
 * whose API key is not configured (per `/api/settings/providers`) render
 * disabled with an inline hint naming the env var. The selection is
 * reported back via `onChange` (the parent persists it).
 */

import * as React from 'react'
import { Check, ChevronDown, Cpu, Lock } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { cn } from '@/shared/data/utils'

const PROVIDERS_ENDPOINT = '/api/settings/providers'
const LOG_PROVIDER_STATUS_FAILED = '[ModelSelector] failed to load provider status:'

/** Structural picker-item shape — tenants map their catalogs onto this. */
export interface ModelPickerOption {
  id: string
  label: string
  provider: string
  /** Matches a key from `/api/settings/providers`. */
  providerKey: string
  /** Env var that must be set for this model to be usable. */
  envVar: string
  description?: string
}

interface ModelSelectorProps {
  value: string
  onChange: (modelId: string) => void
  /** Options to offer, in display order (tenant-provided). */
  models: ModelPickerOption[]
  className?: string
}

interface ProvidersResponse {
  providers: Record<string, boolean>
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  models,
  className,
}) => {
  const [providers, setProviders] = React.useState<Record<string, boolean> | null>(null)

  React.useEffect(() => {
    let cancelled = false
    fetch(PROVIDERS_ENDPOINT)
      .then(res => res.json())
      .then((data: ProvidersResponse) => {
        if (!cancelled) setProviders(data.providers ?? {})
      })
      .catch(err => {
        console.warn(LOG_PROVIDER_STATUS_FAILED, err)
        if (!cancelled) setProviders({})
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = models.find(model => model.id === value)
  const selectedLabel = selected?.label ?? value

  // Group models by provider, preserving list order.
  const grouped = React.useMemo(() => {
    const map = new Map<string, ModelPickerOption[]>()
    for (const model of models) {
      const list = map.get(model.provider) ?? []
      list.push(model)
      map.set(model.provider, list)
    }
    return Array.from(map.entries())
  }, [models])

  const isAvailable = (model: ModelPickerOption): boolean => {
    if (providers === null) return true // while loading, don't grey out
    return !!providers[model.providerKey]
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1.5 px-2 text-xs font-mono', className)}
          aria-label="Select chat model"
        >
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Model</span>
          <span className="font-semibold text-foreground">{selectedLabel}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {grouped.map(([provider, providerModels], groupIdx) => (
          <React.Fragment key={provider}>
            {groupIdx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
              {provider}
            </DropdownMenuLabel>
            {providerModels.map(model => {
              const available = isAvailable(model)
              const isSelected = model.id === value
              return (
                <DropdownMenuItem
                  key={model.id}
                  disabled={!available}
                  onSelect={() => onChange(model.id)}
                  className="flex items-start gap-2 py-1.5"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      {model.label}
                      {!available && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {available
                        ? model.description
                        : `Set ${model.envVar} to enable`}
                    </span>
                  </span>
                </DropdownMenuItem>
              )
            })}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
