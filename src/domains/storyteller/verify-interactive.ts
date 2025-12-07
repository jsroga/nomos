
import 'dotenv/config'
import { showrunnerAgent } from './agents/showrunner'
import { WritersRoomState } from './graph/state'
import { AIMessage, HumanMessage } from '@langchain/core/messages'

async function runTest() {
    console.log("Testing Interactive Premise Flow...")

    // Scenario 1: Empty Bible -> Should ask for Rules
    console.log("\n--- TEST 1: Empty Bible ---")
    const state1: WritersRoomState = {
        messages: [new HumanMessage("Let's build a new world")],
        currentPhase: 'premise',
        seriesBible: {},
        // minimal other fields
        projectId: 'test',
        episodeId: 'test',
        phaseIterations: 0,
        beatBoard: [],
        currentBeat: undefined,
        unresolvedSetups: [],
        rejectedBeats: [],
        scriptVersion: 0,
        beatChallengeCount: 0,
        reflectionNotes: [],
        characters: []
    } as unknown as WritersRoomState

    const result1 = await showrunnerAgent(state1)
    const msg1 = result1.messages?.[0] as AIMessage
    console.log("Response:", msg1.content.slice(0, 100) + "...")
    if (msg1.content.includes("WORLD GENESIS: PHASE 1")) {
        console.log("✅ Passed: Asked for Rules")
    } else {
        console.error("❌ Failed: Didn't ask for Rules")
    }

    // Scenario 2: Rules Set -> Should ask for Factions
    console.log("\n--- TEST 2: Rules Set ---")
    const state2 = { ...state1, seriesBible: { worldRules: [{ rule: 'Magic cost life', category: 'Magic', consequence: 'Death' }] } }
    const result2 = await showrunnerAgent(state2)
    const msg2 = result2.messages?.[0] as AIMessage
    console.log("Response:", msg2.content.slice(0, 100) + "...")
    if (msg2.content.includes("WORLD GENESIS: PHASE 2")) {
        console.log("✅ Passed: Asked for Factions")
    } else {
        console.error("❌ Failed: Didn't ask for Factions")
    }

    // Scenario 3: Factions Set, No Sequences -> Should Consult Architect or Ask for Spark
    // Note: Showrunner routes to Architect first if last msg was not from Architect.
    // To test Step 3, we need to simulate that Architect just returned.
    console.log("\n--- TEST 3: Factions Set (Simulate Architect Return) ---")
    const state3 = {
        ...state2,
        seriesBible: {
            ...state2.seriesBible,
            factions: [{ id: 'f1', name: 'Guild', ideology: 'Power', goals: ['Control'], resources: 'Gold' }]
        },
        messages: [
            new HumanMessage("Here are the factions"),
            new AIMessage({ content: "I have updated the bible", name: 'PremiseArchitect' })
        ]
    }

    // showrunner sees last msg from Architect, should trigger Step 3
    const result3 = await showrunnerAgent(state3)
    const msg3 = result3.messages?.[0] as AIMessage
    console.log("Response:", msg3.content.slice(0, 100) + "...")
    if (msg3.content.includes("WORLD GENESIS: PHASE 3")) {
        console.log("✅ Passed: Asked for Inciting Incident")
    } else {
        console.error("❌ Failed: Didn't ask for Inciting Incident")
    }
}

runTest().catch(console.error)
