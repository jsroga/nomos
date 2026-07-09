const noMagicString = require('./no-magic-string')
const maxLinesStrict = require('./max-lines-strict')
const complexityStrict = require('./complexity-strict')

module.exports = {
  rules: {
    'no-magic-string': noMagicString,
    'max-lines-strict': maxLinesStrict,
    'complexity-strict': complexityStrict,
  },
}
