import React from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/Button'
import type { McpApiKey } from '@/domains/world-building-toolkit/core/io/settings.api'

interface SettingsDialogMcpKeysTabProps {
  mcpKeys: McpApiKey[]
  isLoadingMcpKeys: boolean
  newMcpKeyName: string
  newlyCreatedKey: string | null
  isCreatingKey: boolean
  onNewMcpKeyNameChange: (value: string) => void
  onCreateMcpKey: () => void
  onRevokeMcpKey: (keyId: string) => void
  onCopyToClipboard: (text: string) => void
}

function partitionActiveMcpKeys(keys: McpApiKey[]): McpApiKey[] {
  const activeKeys: McpApiKey[] = []
  for (const key of keys) {
    if (!key.revoked_at) {
      activeKeys.push(key)
    }
  }
  return activeKeys
}

export const SettingsDialogMcpKeysTab: React.FC<SettingsDialogMcpKeysTabProps> = ({
  mcpKeys,
  isLoadingMcpKeys,
  newMcpKeyName,
  newlyCreatedKey,
  isCreatingKey,
  onNewMcpKeyNameChange,
  onCreateMcpKey,
  onRevokeMcpKey,
  onCopyToClipboard,
}) => {
  const activeKeys = partitionActiveMcpKeys(mcpKeys)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">MCP API Keys</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Generate keys for external MCP clients (Cursor, Claude Desktop, etc.)
        </p>

        <div className="p-4 rounded-lg bg-card border border-primary/30 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMcpKeyName}
              onChange={e => onNewMcpKeyNameChange(e.target.value)}
              placeholder="Key name (e.g., My Cursor)"
              className="flex-1 p-2 rounded-md border border-input bg-background text-sm"
              onKeyDown={e => e.key === 'Enter' && onCreateMcpKey()}
            />
            <Button size="sm" onClick={onCreateMcpKey} disabled={isCreatingKey}>
              {isCreatingKey ? 'Creating...' : '+ Create'}
            </Button>
          </div>

          {newlyCreatedKey && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md space-y-2">
              <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
                <Info className="w-3 h-3" />
                Save this key now — it won&apos;t be shown again!
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-black/30 rounded text-xs font-mono truncate">
                  {newlyCreatedKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCopyToClipboard(newlyCreatedKey)}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          {isLoadingMcpKeys ? (
            <div className="text-xs text-muted-foreground">Loading keys...</div>
          ) : activeKeys.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Your Keys
              </div>
              {activeKeys.map(key => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-md border border-border"
                >
                  <div>
                    <div className="text-sm font-medium">{key.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => onRevokeMcpKey(key.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No keys yet. Create one above.</div>
          )}
        </div>
      </div>
    </div>
  )
}
