/**
 * Exported service functions must take a `ProjectScope`, not a bare `projectId`.
 * Escape one declaration with `// project-scope: none — <reason>` above it.
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

    /** The escape applies to the declaration it sits above, never the file. */
    function hasEscapeComment(node) {
      let current = node
      while (current) {
        for (const comment of sourceCode.getCommentsBefore(current)) {
          if (comment.value.includes(ESCAPE_HATCH)) return true
        }
        // The comment may sit above `export`, `async`, or the JSDoc block.
        if (
          current.parent &&
          (current.parent.type === 'ExportNamedDeclaration' ||
            current.parent.type === 'ExportDefaultDeclaration' ||
            current.parent.type === 'VariableDeclaration')
        ) {
          current = current.parent
          continue
        }
        return false
      }
      return false
    }

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
      if (hasEscapeComment(node)) return
      reportBareParams(node.params)
    }

    /** Exported `const fn = (projectId: string) => …`. */
    function checkVariable(node) {
      const init = node.init
      if (!init) return
      if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression') return
      if (!isExported(node)) return
      if (hasEscapeComment(node)) return
      reportBareParams(init.params)
    }

    /** Public methods are the surface; a `private` one is an internal helper. */
    function checkMethod(node) {
      if (!node.value?.params) return
      if (node.accessibility === 'private' || node.key?.type === 'PrivateIdentifier') return
      if (hasEscapeComment(node)) return
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
