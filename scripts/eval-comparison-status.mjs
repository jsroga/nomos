/**
 * Pre-commit eval honesty: a comparison is a pass only when `passed` is true.
 * A missing key is skipped — skipped is not passed.
 */

export const EvalComparisonStatus = {
  Passed: 'passed',
  Failed: 'failed',
  Skipped: 'skipped',
}

const PASSED_KEY = 'passed'

/**
 * @param {unknown} artifact
 * @returns {'passed' | 'failed' | 'skipped'}
 */
export function evalComparisonStatus(artifact) {
  if (artifact === null || typeof artifact !== 'object') {
    return EvalComparisonStatus.Skipped
  }
  if (!Object.prototype.hasOwnProperty.call(artifact, PASSED_KEY)) {
    return EvalComparisonStatus.Skipped
  }
  const passed = Reflect.get(artifact, PASSED_KEY)
  return passed === true ? EvalComparisonStatus.Passed : EvalComparisonStatus.Failed
}
