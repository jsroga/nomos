/**
 * How a model is chosen. Not *which* model — that stays with the domain.
 *
 * Three files repeated the same precedence chain — per-request override →
 * admin-panel setting → operator env var → default — differing only in the
 * role name, the env var, and whether the result is a Mastra gateway string or
 * a bare OpenRouter id. That mechanism lives here now.
 *
 * A domain's *choices* (which model for which agent, at what temperature) are
 * domain policy and stay in the domain: `shared/` must not know what a
 * storyteller agent is, and folding an agent×model matrix in here would be a
 * worse design than the duplication it removed.
 */
import { toOpenRouterModel, toOpenRouterModelId } from '@/shared/agent-kernel/models'
import { getConfiguredModel } from '@/shared/agent-kernel/model-settings'

export interface ModelRoleSpec {
  /** Key the admin panel stores a setting under. */
  readonly role: string
  /** Operator env var — the rollback lever, honoured unvalidated. */
  readonly envVar: string
}

/**
 * The precedence chain, once.
 *
 * Read from `process.env` at call time rather than module load, so a
 * dotenv-loading script and a per-environment rollback both work without
 * import-order sensitivity.
 */
export function resolveConfiguredModelId(
  spec: ModelRoleSpec,
  override?: string
): string | undefined {
  return override || getConfiguredModel(spec.role) || process.env[spec.envVar]
}

/** The chain, normalised to the Mastra `provider/model` gateway form. */
export function resolveGatewayModel(spec: ModelRoleSpec, override?: string): string {
  return toOpenRouterModel(resolveConfiguredModelId(spec, override))
}

/** The chain, normalised to a bare OpenRouter model id. */
export function resolveOpenRouterModelId(spec: ModelRoleSpec, override?: string): string {
  return toOpenRouterModelId(resolveConfiguredModelId(spec, override))
}
