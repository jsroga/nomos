
const { storyCreationWorkflow } = require('./src/domains/storyteller/agents/v2/story-workflow.ts')

console.log('storyCreationWorkflow type:', typeof storyCreationWorkflow)
console.log('Available methods:', Object.keys(storyCreationWorkflow))
console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(storyCreationWorkflow)))

if (storyCreationWorkflow.createRun) console.log('Has createRun')
if (storyCreationWorkflow.createRunAsync) console.log('Has createRunAsync')
