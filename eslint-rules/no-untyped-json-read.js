/**
 * A shape is established once, at the edge — not re-derived at every reader.
 *
 * `recordFromJson` and `readString` are not bugs; this repo bans `as`, and they
 * were the honest way to handle untyped data. The problem is *where* they run.
 * Guarding field by field at a thousand call sites means the shape is never
 * established anywhere, so a payload that lost a field produces `undefined` at
 * whichever reader touches it first, far from the cause.
 *
 * Scoped module by module as each one's `contracts/` lands, and only turned to
 * `error` for modules already at zero — flipping it repo-wide over a thousand
 * sites would make `npm run lint` useless on day one.
 */

const ALLOWED_DIRECTORIES = ['/contracts/', '/core/io/']
const GUARDS = new Set(['recordFromJson', 'readString', 'readNumber', 'stringArrayFromJson'])

/** Path separators differ per platform; compare on a normalised path. */
function isEdgeModule(filename) {
  const path = filename.split('\\').join('/')
  return ALLOWED_DIRECTORIES.some(directory => path.includes(directory))
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Untyped JSON is parsed in contracts/, not guarded at every reader.',
    },
    schema: [],
    messages: {
      untyped:
        '`{{name}}` re-derives a shape here instead of reading one. Parse it once in this ' +
        'module\'s `contracts/` and pass the typed value inward — a guard at the reader means ' +
        'a missing field surfaces far from its cause. Rule: SPEC-16.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (isEdgeModule(filename)) return {}
    if (filename.includes('__tests__') || filename.includes('.test.')) return {}

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !GUARDS.has(node.callee.name)) return
        context.report({ node, messageId: 'untyped', data: { name: node.callee.name } })
      },
    }
  },
}
