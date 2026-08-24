/**
 * A route that binds the authenticated session and then discards it.
 *
 * `_auth` / `{ session: _session }` is TypeScript's "deliberately unused"
 * convention, and in an API route it usually means the handler proved *that*
 * someone is signed in and then acted on a caller-supplied id without checking
 * *who* they are. That signature covered a cross-tenant chat endpoint, an
 * unscoped entity write, and an admin-migration endpoint any user could call.
 *
 * Some routes genuinely need only session existence. Those say so in a comment
 * the rule can see — an explicit, greppable statement rather than a path
 * exemption, which would be acquirable by moving the file.
 */

const ESCAPE_HATCH = 'auth-scope: session-existence-only'
const DISCARDED_NAMES = new Set(['_auth', '_session'])
const AUTH_TYPE = 'AuthenticatedRequest'

/** Path separators differ per platform. */
function isApiRoute(filename) {
  return filename.split('\\').join('/').includes('/src/app/api/')
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'API route handlers must use the authenticated session, or state why they only need its existence.',
    },
    schema: [],
    messages: {
      discarded:
        'This handler binds the authenticated session and never uses it. ' +
        'If the request touches tenant data, scope it: ' +
        'verifyProjectAccess(projectId, session.user.id) → 404 on failure. ' +
        'If it genuinely needs only "a session exists", say so on the first line of the handler: ' +
        '// ' + ESCAPE_HATCH + ' — <reason>. Rule: A4.',
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename()
    if (!isApiRoute(filename)) return {}

    const sourceText = context.sourceCode?.getText() ?? context.getSourceCode().getText()
    if (sourceText.includes(ESCAPE_HATCH)) return {}

    function report(node) {
      context.report({ node, messageId: 'discarded' })
    }

    return {
      /** `async (req, _auth: AuthenticatedRequest) => {}` */
      Identifier(node) {
        if (!DISCARDED_NAMES.has(node.name)) return
        if (node.parent?.type === 'Property' && node.parent.key === node) return
        report(node)
      },
      /** `{ session: _session }: AuthenticatedRequest` */
      ObjectPattern(node) {
        const annotation = node.typeAnnotation?.typeAnnotation
        if (annotation?.typeName?.name !== AUTH_TYPE) return
        for (const property of node.properties) {
          if (property.type !== 'Property') continue
          if (property.value?.type === 'Identifier' && DISCARDED_NAMES.has(property.value.name)) {
            report(property)
          }
        }
      },
    }
  },
}
