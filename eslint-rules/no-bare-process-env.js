/**
 * `process.env.X` is read in one place: `@/shared/config/env`.
 *
 * 63 variables were read from 74 files and 28 were written down, so a missing
 * one produced `undefined` rather than an error, and surfaced far from the
 * cause. The schema turns that into a named failure at boot.
 *
 * Four categories are exempt because they cannot go through it: `NEXT_PUBLIC_*`
 * (Next inlines them only as literal member expressions), runtime-provided
 * values the platform sets, assignments — outbound configuration for an SDK to
 * read rather than configuration we consume — and lookups by a *variable* key,
 * which no schema can name. A quoted key is still reported, so the rule cannot
 * be sidestepped by writing `process.env['OPENAI_API_KEY']`.
 */

const CONFIG_MODULE = 'shared/config'
const PUBLIC_PREFIX = 'NEXT_PUBLIC_'
const RUNTIME_PROVIDED = new Set(['NODE_ENV', 'NEXT_RUNTIME', 'VITEST', 'PORT'])

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Server configuration is read from @/shared/config/env, not process.env.' },
    schema: [],
    messages: {
      bare:
        'Read configuration from `env` in @/shared/config/env, not process.env directly. ' +
        'A missing variable there fails at boot with its name; here it is `undefined` ' +
        'and surfaces later as a 500 or a provider call with no key. Rule: SPEC-12.',
    },
  },

  create(context) {
    const filename = (context.filename ?? context.getFilename()).split('\\').join('/')
    if (filename.includes(CONFIG_MODULE)) return {}
    if (filename.includes('__tests__') || filename.includes('.test.')) return {}

    /** `process.env.X` where X is not exempt, and not the target of an assignment. */
    return {
      MemberExpression(node) {
        const { object, property } = node
        if (object.type !== 'MemberExpression') return
        if (object.object?.name !== 'process' || object.property?.name !== 'env') return
        // `process.env[someVariable]` — genuinely dynamic, and the pattern
        // `feature-flags.ts` already uses correctly. A quoted key is not.
        if (node.computed && property.type !== 'Literal') return

        const name = node.computed ? property.value : property.name
        if (typeof name !== 'string') return
        if (name.startsWith(PUBLIC_PREFIX) || RUNTIME_PROVIDED.has(name)) return

        const isAssignmentTarget =
          node.parent?.type === 'AssignmentExpression' && node.parent.left === node
        if (isAssignmentTarget) return

        context.report({ node, messageId: 'bare' })
      },
    }
  },
}
