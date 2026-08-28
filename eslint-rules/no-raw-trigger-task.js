/**
 * A background task is defined in one shape, and that shape is `defineOwnedTask`.
 *
 * Nineteen tasks were written by copying a working one, so the first task's
 * omissions — no payload schema, no queue, no duplicate-submit protection —
 * became the house style. The factory makes those unexpressible; this rule
 * stops someone reaching past it to the raw SDK.
 *
 * Also fences `@trigger.dev/sdk/v3`: CLAUDE.md mandates the v4 entrypoint, and
 * 52 files imported the v3 subpath because that is what the first task did.
 */

const FACTORY_MODULE = 'src/shared/jobs/define-task.ts'
const RAW_FACTORIES = new Set(['task', 'schemaTask'])
const V3_SUBPATH = '@trigger.dev/sdk/v3'

/** Path separators differ per platform; compare on a normalised path. */
function isFactoryModule(filename) {
  return filename.split('\\').join('/').endsWith(FACTORY_MODULE)
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Background tasks are defined through defineOwnedTask, on the v4 entrypoint.',
    },
    schema: [],
    messages: {
      raw:
        '`{{name}}(…)` builds a task with no payload schema, no queue and no submission key. ' +
        'Use defineOwnedTask from "@/shared/jobs", which requires all three. Rule: SPEC-14.',
      v3:
        'Import from "@trigger.dev/sdk", not "@trigger.dev/sdk/v3". CLAUDE.md mandates the v4 ' +
        'entrypoint; the v3 subpath is a compatibility alias. Rule: SPEC-14.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    const inFactory = isFactoryModule(filename)

    /** `task({…})` / `schemaTask({…})` anywhere but the factory. */
    function reportRawFactory(node) {
      if (inFactory) return
      if (node.callee.type !== 'Identifier' || !RAW_FACTORIES.has(node.callee.name)) return
      context.report({ node, messageId: 'raw', data: { name: node.callee.name } })
    }

    /** Static and dynamic imports of the v3 subpath alike. */
    function reportV3(node, source) {
      if (source !== V3_SUBPATH) return
      context.report({ node, messageId: 'v3' })
    }

    return {
      CallExpression: reportRawFactory,
      ImportDeclaration(node) {
        reportV3(node, node.source.value)
      },
      // `await import('…')` — a separate node type, not a call with an
      // `Import` callee, which is how the first draft of this rule missed it.
      ImportExpression(node) {
        if (node.source.type !== 'Literal') return
        reportV3(node, node.source.value)
      },
      ExportNamedDeclaration(node) {
        if (node.source) reportV3(node, node.source.value)
      },
      ExportAllDeclaration(node) {
        reportV3(node, node.source.value)
      },
    }
  },
}
