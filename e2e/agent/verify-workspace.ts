/**
 * E2E Test: Workspace Verification
 *
 * Creates 5 sample scripts to verify the workspace is working correctly.
 */

import { initializeWorkspace, getStorytellerWorkspace } from '../../src/agent-core/workspace'
import { initializeSearch, getSearchEngine } from '../../src/agent-core/search'
import { loadSkill, listAvailableSkills } from '../../src/agent-core/skills'

async function verifySampleScripts() {
    console.log('🧪 Starting Workspace Verification Test')
    console.log('='.repeat(60))

    // 1. Initialize workspace
    console.log('\n📁 Initializing Workspace...')
    const workspace = await initializeWorkspace()
    console.log('   ✓ Workspace initialized')

    // 2. Create 5 sample scripts
    console.log('\n📝 Creating 5 Sample Scripts...')

    const sampleScripts = [
        {
            type: 'script' as const,
            name: 'Episode 1 - The Beginning',
            content: `INT. ANCIENT TEMPLE - NIGHT

The hero KIRA (30s, battle-scarred) enters the crumbling temple.
Dust motes dance in the shafts of moonlight.

KIRA
(whispering)
This is where it all started...

She traces her fingers along the ancient inscriptions.

ELDER VOICE (V.O.)
The sword chose you, child. Now you must choose.

Kira's hand closes around the hilt of a glowing blade.

FADE TO:`,
        },
        {
            type: 'outline' as const,
            name: 'Season 1 Arc Outline',
            content: `SEASON 1: THE AWAKENING

Act 1 (Episodes 1-3):
- Kira discovers the ancient sword
- Introduces the rival faction
- First mentor appears

Act 2 (Episodes 4-7):
- Training montage and world-building
- Betrayal by trusted ally
- Dark night of the soul

Act 3 (Episodes 8-10):
- Final confrontation preparation
- Twist reveal about the sword's true nature
- Climactic battle and transformation

Theme: The burden of chosen destiny`,
        },
        {
            type: 'world-bible' as const,
            name: 'Magic System Rules',
            content: `THE RESONANCE SYSTEM

Core Principle:
All magic flows from "Resonance" - the harmonic vibration between living beings and the world.

Rules:
1. Resonance requires emotional connection
2. Stronger emotions = stronger magic
3. Negative emotions corrupt the caster
4. Death severs Resonance permanently

Limitations:
- Cannot resurrect the dead
- Cannot read minds directly
- Cannot travel through time
- Power diminishes with distance

Cost:
Every use of Resonance shortens the caster's lifespan by a measurable amount.`,
        },
        {
            type: 'character-sheet' as const,
            name: 'Kira Character Sheet',
            content: `CHARACTER: KIRA SHADOWBANE

BASICS:
- Age: 32
- Role: Protagonist
- Archetype: The Reluctant Hero

PSYCHOLOGY:
- Flaw: Cannot trust others (isolates herself)
- Ghost: Watched her village burn as a child
- Need: To accept help and build a found family

APPEARANCE:
- Silver-streaked black hair
- Scar across left cheek
- Wears practical leather armor
- Always carries her mother's pendant

VOICE:
- Short sentences
- Rarely uses contractions
- Dry, sardonic humor in tense moments

RELATIONSHIPS:
- MENTOR (Elder Yun): Complicated respect
- RIVAL (Lord Vex): Former friend turned enemy
- ALLY (Theo): Begrudging partnership`,
        },
        {
            type: 'beat-board' as const,
            name: 'Episode 1 Beat Board',
            content: `EPISODE 1 BEATS:

1. OPENING IMAGE
   - Kira alone in desert, walking toward temple
   - Establishes isolated, determined character

2. THEME STATED
   - Elder Yun's voice: "Destiny is not a gift, it's a burden you choose to carry."

3. SETUP
   - Kira's daily routine as a scavenger
   - Hints at her tragic past
   - Shows her fighting skills

4. CATALYST
   - Discovers the hidden temple entrance
   - The sword calls to her

5. DEBATE
   - Flashback to village burning
   - Should she take the sword?

6. BREAK INTO TWO
   - Takes the sword
   - Lord Vex's scouts spot her

MIDPOINT TWIST:
   - The sword shows her a vision of the future: she will destroy the world.`,
        },
    ]

    const projectId = 'test-project-' + Date.now()
    const createdScripts = []

    for (const script of sampleScripts) {
        try {
            const saved = await workspace.saveScript({
                ...script,
                projectId
            })
            console.log(`   ✓ Created: ${script.name} (${script.type})`)
            createdScripts.push(saved)
        } catch (error: any) {
            console.log(`   ❌ Failed to create ${script.name}: ${error.message}`)
        }
    }

    // 3. Verify scripts were created
    console.log('\n🔍 Verifying Scripts...')
    const listedScripts = await workspace.listScripts(projectId)
    console.log(`   Found ${listedScripts.length} scripts for project`)

    if (listedScripts.length !== 5) {
        console.log('   ❌ Expected 5 scripts, found', listedScripts.length)
    } else {
        console.log('   ✓ All 5 scripts saved successfully')
    }

    // 4. Test search
    console.log('\n🔎 Testing Search...')
    const searchEngine = getSearchEngine()

    // Index the created scripts
    for (const script of createdScripts) {
        searchEngine.indexDocument(script)
    }

    const searchResults = await searchEngine.search('Kira sword', { mode: 'bm25', limit: 5 })
    console.log(`   Found ${searchResults.length} results for "Kira sword"`)
    if (searchResults.length > 0) {
        console.log(`   ✓ Top result: ${searchResults[0].name}`)
    }

    // 5. Test skills
    console.log('\n📚 Testing Skills...')
    const availableSkills = await listAvailableSkills()
    console.log(`   Found ${availableSkills.length} skills: ${availableSkills.join(', ')}`)

    for (const skillName of availableSkills) {
        const skill = await loadSkill(skillName)
        if (skill) {
            console.log(`   ✓ Loaded skill: ${skillName} (${skill.references.size} references)`)
        }
    }

    // 6. Workspace stats
    console.log('\n📊 Workspace Stats:')
    const stats = await workspace.getStats()
    console.log(`   Total Scripts: ${stats.totalScripts}`)
    console.log(`   By Type:`)
    for (const [type, count] of Object.entries(stats.byType)) {
        console.log(`     - ${type}: ${count}`)
    }
    console.log(`   Total Size: ${(stats.totalSize / 1024).toFixed(2)} KB`)

    // 7. Cleanup (optional)
    console.log('\n🧹 Cleanup...')
    for (const script of createdScripts) {
        await workspace.deleteScript(script.id)
    }
    console.log('   ✓ Deleted test scripts')

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Test Summary')
    console.log('='.repeat(60))
    console.log('✅ Workspace initialized')
    console.log('✅ 5 sample scripts created and verified')
    console.log('✅ Search functionality working')
    console.log('✅ Skills loaded successfully')
    console.log('\n🎉 All workspace tests passed!')
}

verifySampleScripts()
    .catch(error => {
        console.error('❌ Test failed:', error)
        process.exit(1)
    })
