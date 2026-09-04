/**
 * Incentive: folders named constants/ should hold values, not functions.
 *
 * Existing helpers under constants/ stay; this rule is warn-only so it does
 * not force a mass move. New code should put logic beside the values, not in
 * the constants folder.
 */

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Discourage FunctionDeclaration / FunctionExpression / ArrowFunctionExpression under **/constants/**.',
    },
    schema: [],
    messages: {
      functionsInConstants:
        'Functions in constants/ folders are discouraged. Keep values here; move logic out of constants/. ' +
        'This rule is warn-only — do not mass-move existing helpers.',
    },
  },

  create(context) {
    const filename = (context.filename ?? context.getFilename()).split('\\').join('/')
    if (!filename.includes('/constants/')) return {}

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
