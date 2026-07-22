import { getAdminPlugins } from '@/shared/admin/plugins/registry'

const READY_LABEL = 'ready'
const STAGED_LABEL = 'staged'

/**
 * Admin → Plugins (Track A4). Lists every registered admin plugin (first-party +
 * any registered at import) with its mount point and status — the visible proof
 * of the plugin contract.
 */
export function AdminPluginsList() {
  const plugins = getAdminPlugins()
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Plugins</h1>
      <p className="mt-1 text-sm opacity-70">
        Registered admin plugins. Sections build the nav; canvas-node / chat-tool
        mounts are reserved for the canvas host and assistant-ui.
      </p>

      <div className="mt-6 space-y-2">
        {plugins.map(plugin => (
          <div
            key={plugin.id}
            className="flex items-center justify-between rounded-lg border border-black/10 p-3 dark:border-white/10"
          >
            <div className="min-w-0">
              <div className="font-medium">{plugin.label}</div>
              <div className="text-xs opacity-60">
                {plugin.mount}
                {plugin.path ? ` · ${plugin.path}` : ''}
              </div>
            </div>
            <span className={`text-xs ${plugin.ready ? 'text-green-600' : 'opacity-50'}`}>
              {plugin.ready ? READY_LABEL : STAGED_LABEL}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
