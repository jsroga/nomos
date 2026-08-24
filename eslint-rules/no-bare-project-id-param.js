/**
 * Exported service functions must take a `ProjectScope`, not a bare `projectId`.
 *
 * A `string` carries no evidence of having been checked, so a function that
 * accepts one relies on every caller remembering — which is how this codebase
 * accumulated cross-tenant reads. `ProjectScope` can only be produced by the
 * function that verifies ownership, so the check becomes a precondition of
 * calling rather than a line someone must write.
 *
 * Escape: a function that *creates* a project has no scope to take. Say so with
 * `// project-scope: none — <reason>` above it, rather than a path exemption.
 */

const ESCAPE_HATCH = 'project-scope: none'
const BARE_PARAM_NAMES = new Set(['projectId'])
const SCOPE_TYPES = new Set(['ProjectScope', 'EpisodeScope', 'BeatScope', 'CharacterScope'])

function isGuardedPath(filename) {
  const normalized = filename.split('\\').join('/')
  return (
    normalized.includes('/services/') ||
    normalized.includes('/shared/persistence/')
  )
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Exported service functions take a verified ProjectScope, not a bare projectId.',
    },
    schema: [],
    messages: {
      bare:
        'Exported service functions must take a ProjectScope, not a bare projectId — ' +
        'a string proves nothing about who is asking. ' +
        'const scope = await projectScope(projectId, session.user.id)  // throws → 404. ' +
        'If this function creates a project and no scope can exist yet, say so: ' +
        '// ' + ESCAPE_HATCH + ' — <reason>. Rule: A4.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (!isGuardedPath(filename)) return {}
    if (filename.includes('__tests__')) return {}

    const sourceCode = context.sourceCode ?? context.getSourceCode()
    if (sourceCode.getText().includes(ESCAPE_HATCH)) return {}

    /** Only exported declarations cross a boundary; private helpers are fine. */
    function isExported(node) {
      let current = node.parent
      while (current) {
        if (
          current.type === 'ExportNamedDeclaration' ||
          current.type === 'ExportDefaultDeclaration'
        ) {
          return true
        }
        current = current.parent
      }
      return false
    }

    function reportBareParams(params) {
      for (const param of params) {
        if (param.type !== 'Identifier') continue
        if (!BARE_PARAM_NAMES.has(param.name)) continue
        const typeName = param.typeAnnotation?.typeAnnotation?.typeName?.name
        if (typeName && SCOPE_TYPES.has(typeName)) continue
        context.report({ node: param, messageId: 'bare' })
      }
    }

    function checkParams(node) {
      if (!isExported(node)) return
      reportBareParams(node.params)
    }

    /** Exported `const fn = (projectId: string) => …`. */
    function checkVariable(node) {
      const init = node.init
      if (!init) return
      if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return
      if (!isExported(node)) return
      reportBareParams(init.params)
    }

    /** Service classes are the surface even though the class is what's exported. */
    function checkMethod(node) {
      if (!node.value?.params) return
      reportBareParams(node.value.params)
    }

    return {
      FunctionDeclaration: checkParams,
      TSDeclareFunction: checkParams,
      VariableDeclarator: checkVariable,
      MethodDefinition: checkMethod,
    }
  },
}
