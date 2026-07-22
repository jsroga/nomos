/**
 * Admin plugin contract (Track A4). A plugin declares where it mounts and how to
 * reach it. The dashboard reads `admin-section` plugins to build its nav; the
 * `canvas-node` / `chat-tool` mounts are reserved for the canvas host and
 * assistant-ui tool surfaces (no consumers yet — typed so the pattern is stable).
 */

export enum AdminPluginMount {
  AdminSection = 'admin-section',
  CanvasNode = 'canvas-node',
  ChatTool = 'chat-tool',
}

export interface AdminPlugin {
  /** Stable id (kebab-case). */
  readonly id: string
  /** Human label shown in nav / listings. */
  readonly label: string
  /** Where this plugin mounts. */
  readonly mount: AdminPluginMount
  /**
   * Route the section renders at (for `admin-section`). The section's UI is the
   * Next page at this path, keeping plugins decoupled from bundle-time wiring.
   */
  readonly path?: string
  /** Whether the plugin is wired end-to-end (false → shown as staged/soon). */
  readonly ready: boolean
  /** Optional ordering hint (lower first); defaults to registration order. */
  readonly order?: number
}
