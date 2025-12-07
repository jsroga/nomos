import { writersRoomGraph } from './writers-room'
import { HumanMessage } from '@langchain/core/messages'

async function main() {
  console.log('Starting Writers Room Simulation...')

  const initialState = {
    projectId: 'test-project',
    currentPhase: 'breaking',
    seriesBible: {
      genre: 'Sci-Fi Thriller',
      premise: 'A time traveler attempts to prevent a paradox but causes it.',
    },
    characters: [
      {
        characterId: 'c1',
        name: 'Dr. Aris',
        role: 'Protagonist',
        currentGoals: ['Fix the timeline'],
        fears: ['Erasing his daughter'],
        selfDelusion: 'I am in control',
        actualMotivation: 'Guilt',
        transformationProgress: 0,
        knowledgeState: {},
      },
    ],
    beatBoard: [],
    messages: [new HumanMessage("Let's break the first scene.")],
  }

  const stream = await writersRoomGraph.stream(initialState, {
    recursionLimit: 5, // Limit to avoid infinite loop in test
  })

  for await (const event of stream) {
    console.log('--- Event ---')
    console.log(JSON.stringify(event, null, 2))
  }
}

main().catch(console.error)
