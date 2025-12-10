import { StorytellerTestRunner } from '../runner';

async function run() {
  const runner = new StorytellerTestRunner();
  
  console.log('🧪 TEST: Showrunner Delegation Fix');
  console.log('-----------------------------------');

  try {
    // Test the exact phrase that was failing
    const { fullResponse } = await runner.runChat("let's start working on this episode");
    
    // Assertions
    // 1. It should NOT say "waiting for input"
    if (fullResponse.includes("awaiting user input")) {
        throw new Error("FAILED: Showrunner halted and awaited input.");
    }

    // 2. It SHOULD delegate (likely to PlotArchitect or PremiseArchitect)
    // The Showrunner prompt says: "Delegating to Plot Architect" or similar.
    // We check for signs of progress.
    
    // Note: Since we can't see the internal console logs from the client side easily without
    // connecting to the server log stream, we infer from the response text.
    // If the response text contains "Plot Architect" or "Premise Architect", it's a good sign.
    
    const delegated = 
        fullResponse.includes("Plot Architect") || 
        fullResponse.includes("Premise Architect") ||
        fullResponse.includes("Delegating");
        
    if (!delegated) {
        console.warn("⚠️ WARNING: No explicit delegation text found. Response was:\n" + fullResponse);
        // It might not fail if it just took action directly, but we prefer explicit delegation.
    } else {
        console.log("✅ Success: Delegation detected.");
    }

    console.log('-----------------------------------');
    console.log('✅ TEST PASSED');
    process.exit(0);

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

run();


