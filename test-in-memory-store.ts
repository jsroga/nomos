import { InMemoryStore } from '@mastra/core/storage'
const store = new InMemoryStore()
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(store)))
