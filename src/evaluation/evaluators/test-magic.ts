import { magicScoreHeuristic, magicScoreEvaluator } from './magic-score'

const AI_SLOP = `
In a world where magic was forbidden, a young mage named Elena found herself caught between two worlds. Her heart pounded as she realized the truth. Little did she know that her journey would change everything.

"As you know, the Council has forbidden all magic," said the wise mentor, his piercing blue eyes meeting hers. "You must be careful."

Elena felt a wave of fear wash over her. Her breath caught in her throat. Time seemed to stand still.

"I never thought this would happen to me," she whispered, tears streaming down her face.

And so, Elena began her journey of self-discovery, learning that the power of friendship could overcome any obstacle. In the end, she found peace and understanding.
`

const GOOD_WRITING = `
The radio crackled. Static. Then nothing.

Marcus wiped engine grease on his jeans—a habit his ex-wife used to hate. "You're disgusting," she'd say. Present tense, always present tense, like the marriage was still happening.

"Copy that. We're—" The voice cut out mid-sentence.

He didn't bother responding. Fourteen years driving this route and he'd learned: when dispatch goes quiet, you keep driving. You don't ask questions. You definitely don't mention the lights you saw over the mesa last Tuesday. Or the car that's been following you since Barstow. Different plates each time. Same crack in the left headlight.

The coffee had gone cold three hours ago. He drank it anyway.

Somewhere behind him, gravel crunched. Too rhythmic to be wind.
`

const MEDIOCRE = `
Sarah walked into the coffee shop and ordered her usual latte. The barista smiled at her.

"Long day?" he asked.

"Yeah, work has been crazy," she replied, rubbing her temples. She'd been at the office until midnight three days in a row.

The shop was quiet this early. A few other customers typed on laptops. The smell of fresh coffee filled the air. Sarah found her usual spot by the window and sat down.

Her phone buzzed. Another email from her boss. She sighed and opened it.
`

async function testHeuristic() {
  console.log("========== HEURISTIC ONLY ==========\n")
  
  console.log("=== AI SLOP SAMPLE ===")
  const slopResult = await magicScoreHeuristic.evaluate({
    input: {},
    output: { response: AI_SLOP }
  })
  console.log("Score:", (slopResult.score * 100).toFixed(0))
  console.log("Reasoning:", slopResult.reasoning)
  const slopMeta = slopResult.metadata as Record<string, unknown>
  console.log("Dimensions:", JSON.stringify(slopMeta.dimensions, null, 2))
  console.log("")
  
  console.log("=== GOOD WRITING SAMPLE ===")
  const goodResult = await magicScoreHeuristic.evaluate({
    input: {},
    output: { response: GOOD_WRITING }
  })
  console.log("Score:", (goodResult.score * 100).toFixed(0))
  console.log("Reasoning:", goodResult.reasoning)
  console.log("")
  
  console.log("=== MEDIOCRE SAMPLE ===")
  const medResult = await magicScoreHeuristic.evaluate({
    input: {},
    output: { response: MEDIOCRE }
  })
  console.log("Score:", (medResult.score * 100).toFixed(0))
  console.log("Reasoning:", medResult.reasoning)
}

async function testFull() {
  console.log("\n========== WITH LLM JUDGE ==========\n")
  
  console.log("=== AI SLOP SAMPLE ===")
  const slopResult = await magicScoreEvaluator.evaluate({
    input: {},
    output: { response: AI_SLOP }
  })
  console.log("Score:", (slopResult.score * 100).toFixed(0))
  console.log("Reasoning:", slopResult.reasoning)
  const slopMeta = slopResult.metadata as Record<string, unknown>
  if (slopMeta.semanticAnalysis) {
    console.log("LLM Analysis:", JSON.stringify(slopMeta.semanticAnalysis, null, 2))
  }
  if (slopMeta.slopIndicators) {
    const indicators = slopMeta.slopIndicators as Array<{evidence: string}>
    console.log("Slop found:", indicators.slice(0, 5).map(i => i.evidence))
  }
  console.log("")
  
  console.log("=== GOOD WRITING SAMPLE ===")
  const goodResult = await magicScoreEvaluator.evaluate({
    input: {},
    output: { response: GOOD_WRITING }
  })
  console.log("Score:", (goodResult.score * 100).toFixed(0))
  console.log("Reasoning:", goodResult.reasoning)
  const goodMeta = goodResult.metadata as Record<string, unknown>
  if (goodMeta.creativeSparks) {
    console.log("Creative sparks:", goodMeta.creativeSparks)
  }
  console.log("")
  
  console.log("=== MEDIOCRE SAMPLE ===")
  const medResult = await magicScoreEvaluator.evaluate({
    input: {},
    output: { response: MEDIOCRE }
  })
  console.log("Score:", (medResult.score * 100).toFixed(0))
  console.log("Reasoning:", medResult.reasoning)
}

async function main() {
  await testHeuristic()
  
  if (process.env.OPENAI_API_KEY) {
    await testFull()
  } else {
    console.log("\nSkipping LLM judge (OPENAI_API_KEY not set)")
  }
}

main()

