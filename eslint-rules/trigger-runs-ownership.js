/**
 * A Trigger.dev run belongs to a tenant.
 *
 * `runs.retrieve` / `runs.cancel` / `runs.subscribeToRun` return or mutate a run
 * by id alone, and a run id is not a capability token — it is handed to the
 * client on trigger and echoed in URLs and logs. Calling them directly is how
 * thirteen status routes came to serve any tenant's generation output to any
 * signed-in user.
 *
 * Ownership lives in one module, so this rule fences the SDK to that module.
 */

const OWNER_MODULE = 'src/shared/jobs/owned-run.ts'
const GUARDED_METHODS = new Set(['retrieve', 'cancel', 'subscribeToRun'])
const RUNS_OBJECT = 'runs'

/** Path separators differ per platform; compare on a normalised path. */
function isOwnerModule(filename) {
  return filename.split('\\').join('/').endsWith(OWNER_MODULE)
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Trigger run APIs may only be called from the module that verifies run ownership.',
    },
    schema: [],
    messages: {
      unowned:
        '`runs.{{method}}` is only allowed in {{owner}}. A run belongs to a tenant, so reading or ' +
        'cancelling one must prove the caller owns its project. Use retrieveOwnedRun(runId, userId) ' +
        'or cancelOwnedRun(runId, userId) from "@/shared/jobs". Rule: A5.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (isOwnerModule(filename)) return {}

    return {
      /** @param {import('estree').MemberExpression} node */
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || node.object.name !== RUNS_OBJECT) return
        if (node.property.type !== 'Identifier') return
        if (!GUARDED_METHODS.has(node.property.name)) return

        context.report({
          node,
          messageId: 'unowned',
          data: { method: node.property.name, owner: OWNER_MODULE },
        })
      },
    }
  },
}
