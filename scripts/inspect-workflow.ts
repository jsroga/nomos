
import { Workflow } from '@mastra/core'

const w = new Workflow({ name: 'test' })
console.log('Instance keys:', Object.keys(w))
console.log(w)
