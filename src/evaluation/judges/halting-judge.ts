
import { BaseJudge, JudgeResult } from './base-judge'
import { ScoreName } from '../engine/scores'

export class HaltingJudge extends BaseJudge {
    name = 'HaltingJudge'
    scoreName = ScoreName.HALTING_ACCURACY

    async evaluate(input: any, output: any, expected?: any): Promise<JudgeResult> {
        // We often expect specific halting behavior
        // expected: { shouldHalt: boolean, shouldNotHalt: boolean }

        const outputStr = typeof output === 'string' ? output
            : output?.message ? output.message
                : JSON.stringify(output)

        const outputHalted = /awaiting[_\s]*(user[_\s]*)?input/i.test(outputStr) || /waiting for/i.test(outputStr) || output?.type === 'ask_user'

        if (expected?.shouldNotHalt && outputHalted) {
            return {
                score: 0,
                scoreName: this.scoreName,
                reason: 'Agent halted when it should have proceeded'
            }
        }

        if (expected?.shouldHalt && !outputHalted) {
            return {
                score: 0,
                scoreName: this.scoreName,
                reason: 'Agent proceeded when it should have halted'
            }
        }

        return {
            score: 1,
            scoreName: this.scoreName,
            reason: 'Halting behavior correct'
        }
    }
}
