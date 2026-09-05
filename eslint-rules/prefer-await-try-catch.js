/**
 * Promise control flow uses `await` + `try/catch`, not `.then` / `.catch` /
 * `.finally`.
 *
 * Allowed: Mastra workflow `.then(step)` (the argument is a step, not a
 * callback) and Zod `.catch(fallback)` where the fallback is a value, not a
 * function.
 */

const PROMISE_METHODS = new Set(['then', 'catch', 'finally'])

/** @param {import('estree').Node | undefined} node */
function isFunctionExpr(node) {
  return Boolean(
    node && (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
  )
}

/** @param {import('estree').MemberExpression} callee */
function methodName(callee) {
  if (callee.computed) {
    const property = callee.property
    if (property.type === 'Literal' && typeof property.value === 'string') return property.value
    return null
  }
  if (callee.property.type === 'Identifier') return callee.property.name
  return null
}

/**
 * Mastra `createWorkflow().then(step)` — the argument is a step reference or
 * a `create*Step()` call, never a promise callback.
 *
 * @param {import('estree').CallExpression} node
 */
function isWorkflowThen(node) {
  if (node.arguments.length !== 1) return false
  const arg = node.arguments[0]
  if (!arg || isFunctionExpr(arg)) return false
  return arg.type === 'Identifier' || arg.type === 'CallExpression'
}

/**
 * Zod `.catch(undefined)` / `.catch(0)` / `.catch([])` — a value fallback, not
 * an error handler.
 *
 * @param {import('estree').Node | undefined} node
 */
function isZodCatchFallback(node) {
  if (!node) return true
  if (isFunctionExpr(node)) return false
  if (node.type === 'Identifier' && node.name === 'undefined') return true
  if (node.type === 'Literal' || node.type === 'TemplateLiteral') return true
  if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression') return true
  if (node.type === 'UnaryExpression') return true
  return false
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Use await and try/catch instead of Promise .then / .catch / .finally.',
    },
    schema: [],
    messages: {
      then:
        'Use `await` in an `async` function instead of `.then()`. Handle rejection with `try/catch`.',
      catch: 'Use `try/catch` around `await` instead of `.catch()`.',
      finally: 'Use `try/finally` around `await` instead of `.finally()`.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression') return
        const name = methodName(callee)
        if (!name || !PROMISE_METHODS.has(name)) return

        if (name === 'then' && isWorkflowThen(node)) return
        if (name === 'catch' && isZodCatchFallback(node.arguments[0])) return

        context.report({ node, messageId: name })
      },
    }
  },
}
