
import { createScriptWriterAgent } from './script-writer'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function verifyToolExecution() {
    console.log("🧪 Starting Integration Test: Executive Tool Execution")

    // 1. Init
    const agent = await createScriptWriterAgent()

    // 2. Setup Dummy Task
    // direct plan manipulation available via the planner tool instance
    // but easier to just ask the agent to do it via 'executeStep'

    const TEST_FILENAME = 'dummy-integration.spec.ts'
    const TEST_CONTENT = `import { test, expect } from '@playwright/test';
test('dummy', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example/);
});`

    const stepId = 'test-step-1'

    // We manually inject the step into the plan first so update_task_status works
    // Actually, update_task_status might fail if task doesn't exist.
    // Let's create a plan first.

    console.log("... Creating Plan")
    await agent['planner'].invoke({
        action: 'create_plan',
        goal: 'Integration Test Plan'
    })

    console.log("... Adding Task")
    await agent['planner'].invoke({
        action: 'add_task',
        title: 'Save dummy file'
    })

    // By default first task is ID "1"

    console.log("... Triggering Execution")
    const result = await agent.executeStep("1", "save_test", {
        filename: TEST_FILENAME,
        content: TEST_CONTENT
    })

    console.log("👉 Execution Result:", result)

    // 3. Verify File
    const filePath = path.join(process.cwd(), 'e2e', 'scenarios', TEST_FILENAME)
    try {
        const stats = await fs.stat(filePath)
        console.log(`✅ File created successfully: ${filePath} (${stats.size} bytes)`)

        // Cleanup
        await fs.unlink(filePath)
        console.log("🧹 Cleanup done.")
    } catch (e) {
        console.error("❌ File NOT created.")
        process.exit(1)
    }
}

verifyToolExecution()
    .catch(console.error)
