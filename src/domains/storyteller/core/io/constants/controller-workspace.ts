/**
 * Filesystem location backing the storyteller controller's workspace.
 *
 * `Session` requires a workspace instance, and the built-in `submit_plan` tool
 * writes the plan markdown to a file inside it. The directory is scratch space,
 * never a source of truth — see `STORYTELLER_WORKSPACE_DIR` below.
 */

/** Override the workspace root (set this when the default tmp dir is unsuitable). */
export const STORYTELLER_WORKSPACE_DIR_ENV = 'STORYTELLER_WORKSPACE_DIR'

/** Folder name created under the OS temp dir when the env override is unset. */
export const STORYTELLER_WORKSPACE_DIR_NAME = 'storyteller-controller-workspace'
