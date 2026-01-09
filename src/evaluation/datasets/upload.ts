/**
 * Dataset Upload Script
 * 
 * Uploads all golden datasets to LangSmith.
 * Run with: npm run eval:upload-datasets
 */

import { Client } from 'langsmith'
import { STORYTELLER_DATASET } from './storyteller-golden'
import { LOOP_CREATOR_DATASET } from './loop-creator-golden'
import { GUARDRAIL_EDGE_CASES_DATASET } from './guardrail-edge-cases'
import { DatasetConfig } from '../types'

const ALL_DATASETS: DatasetConfig[] = [
  STORYTELLER_DATASET,
  LOOP_CREATOR_DATASET,
  GUARDRAIL_EDGE_CASES_DATASET,
]

async function uploadDataset(client: Client, config: DatasetConfig) {
  console.log(`\n📦 Uploading dataset: ${config.name}`)
  console.log(`   Description: ${config.description}`)
  console.log(`   Examples: ${config.examples.length}`)

  try {
    // Check if dataset already exists
    let dataset
    try {
      dataset = await client.readDataset({ datasetName: config.name })
      console.log(`   ⚠️  Dataset already exists. Updating...`)
    } catch {
      // Dataset doesn't exist, create it
      dataset = await client.createDataset(config.name, {
        description: config.description,
      })
      console.log(`   ✅ Created new dataset`)
    }

    // Upload examples
    let uploadedCount = 0
    let skippedCount = 0

    for (const example of config.examples) {
      try {
        await client.createExample(
          example.input,
          example.expected || {},
          {
            datasetId: dataset.id,
            metadata: { ...example.metadata, originalId: example.id },
          }
        )
        uploadedCount++
      } catch (err: unknown) {
        // Example might already exist
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (errorMessage.includes('already exists')) {
          skippedCount++
        } else {
          console.error(`   ❌ Failed to upload example ${example.id}:`, errorMessage)
        }
      }
    }

    console.log(`   📊 Uploaded: ${uploadedCount}, Skipped: ${skippedCount}`)
    return { success: true, datasetId: dataset.id }
  } catch (error) {
    console.error(`   ❌ Failed to upload dataset ${config.name}:`, error)
    return { success: false, error }
  }
}

export async function uploadAllDatasets() {
  console.log('🚀 LangSmith Dataset Upload')
  console.log('===========================')

  // Check environment
  if (!process.env.LANGCHAIN_API_KEY) {
    console.error('❌ LANGCHAIN_API_KEY is not set')
    console.log('   Please set LANGCHAIN_API_KEY in your .env.local file')
    process.exit(1)
  }

  const client = new Client({
    apiKey: process.env.LANGCHAIN_API_KEY,
  })

  const results: Array<{ name: string; success: boolean }> = []

  for (const dataset of ALL_DATASETS) {
    const result = await uploadDataset(client, dataset)
    results.push({ name: dataset.name, success: result.success })
  }

  console.log('\n===========================')
  console.log('📋 Upload Summary')
  console.log('===========================')

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`✅ Successful: ${successful.length}`)
  successful.forEach((r) => console.log(`   - ${r.name}`))

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}`)
    failed.forEach((r) => console.log(`   - ${r.name}`))
  }

  console.log('\n🔗 View datasets at: https://smith.langchain.com/datasets')

  return results
}

// Run if executed directly
if (require.main === module) {
  uploadAllDatasets()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err)
      process.exit(1)
    })
}

