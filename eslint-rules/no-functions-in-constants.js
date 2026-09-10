/**
 * Folders named constants/ hold values only (enums, tables, limits).
 * Functions, arrows, and function expressions belong in the same-layer utils/
 * or a named module. Severity is error in eslint.config.js.
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid FunctionDeclaration / FunctionExpression / ArrowFunctionExpression under **/constants/**.',
    },
    schema: [],
    messages: {
      functionsInConstants:
        'Functions are forbidden in constants/ folders. Keep values here; git mv logic to the same-layer utils/ or a named module.',
    },
  },

  create(context) {
    const filename = (context.filename ?? context.getFilename()).split('\\').join('/')
    if (!filename.includes('/constants/')) return {}
    if (filename.includes('/__tests__/') || /\.test\.(ts|tsx)$/.test(filename)) return {}

    const report = node => {
      context.report({ node, messageId: 'functionsInConstants' })
    }

    return {
      FunctionDeclaration(node) {
        report(node)
      },
      FunctionExpression(node) {
        report(node)
      },
      ArrowFunctionExpression(node) {
        report(node)
      },
    }
  },
}
