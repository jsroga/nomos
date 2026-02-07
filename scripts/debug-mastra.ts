import { Workflow } from '@mastra/core/workflows';

console.log('Workflow Prototype Methods:', Object.getOwnPropertyNames(Workflow.prototype));
try {
    const wf = new Workflow({ name: 'debug' });
    console.log('Workflow Instance Keys:', Object.keys(wf));
    console.log('Has step method?', typeof (wf as any).step);
} catch (e) {
    console.error('Error instantiating Workflow:', e);
}
