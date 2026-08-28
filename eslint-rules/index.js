const noMagicString = require('./no-magic-string')
const maxLinesStrict = require('./max-lines-strict')
const complexityStrict = require('./complexity-strict')
const noRepeatedArrayFilter = require('./no-repeated-array-filter')
const triggerRunsOwnership = require('./trigger-runs-ownership')
const noDiscardedAuthContext = require('./no-discarded-auth-context')
const noBareProjectIdParam = require('./no-bare-project-id-param')
const noBareProcessEnv = require('./no-bare-process-env')
const noRawTriggerTask = require('./no-raw-trigger-task')
const noUntypedJsonRead = require('./no-untyped-json-read')

module.exports = {
  rules: {
    'no-magic-string': noMagicString,
    'max-lines-strict': maxLinesStrict,
    'complexity-strict': complexityStrict,
    'no-repeated-array-filter': noRepeatedArrayFilter,
    'trigger-runs-ownership': triggerRunsOwnership,
    'no-discarded-auth-context': noDiscardedAuthContext,
    'no-bare-project-id-param': noBareProjectIdParam,
    'no-bare-process-env': noBareProcessEnv,
    'no-raw-trigger-task': noRawTriggerTask,
    'no-untyped-json-read': noUntypedJsonRead,
  },
}
