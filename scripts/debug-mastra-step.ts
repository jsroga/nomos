import * as MastraWorkflows from '@mastra/core/workflows'

console.log('Exports from @mastra/core/workflows:', Object.keys(MastraWorkflows))
try {
    const { Step } = MastraWorkflows
    console.log('Step type:', typeof Step)
    if (typeof Step === 'function') {
        console.log('Step prototype:', Object.getOwnPropertyNames(Step.prototype))
    }
} catch (e) {
    console.error('Error checking Step:', e)
}
