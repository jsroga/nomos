/**
 * Confident AI Setup
 * 
 * Ensures metrics and collections are created on Confident AI
 * before running experiments.
 */

import { getConfidentAIClient, CreateMetricRequest } from './client'
import { STORYTELLER_METRICS, getMetricNames } from './metrics'

const STORYTELLER_COLLECTION_NAME = 'Storyteller Full v3'
const STORYTELLER_QUICK_COLLECTION = 'Storyteller Quick v3'

/**
 * Ensure all storyteller metrics exist on Confident AI
 */
export async function ensureMetricsExist(): Promise<void> {
  const client = getConfidentAIClient()
  
  console.log('📊 Checking Confident AI metrics...')
  
  // Get existing metrics
  const { data } = await client.listMetrics()
  const existingNames = new Set(data.metrics.map(m => m.name))
  
  // Create missing metrics
  for (const metric of STORYTELLER_METRICS) {
    if (!existingNames.has(metric.name)) {
      console.log(`  Creating metric: ${metric.name}`)
      await client.createMetric(metric)
    } else {
      console.log(`  ✓ Metric exists: ${metric.name}`)
    }
  }
  
  console.log('✅ All metrics ready')
}

/**
 * Ensure the storyteller metric collection exists
 */
export async function ensureCollectionExists(
  collectionName: string = STORYTELLER_COLLECTION_NAME,
  metricNames?: string[]
): Promise<void> {
  const client = getConfidentAIClient()
  
  console.log(`📦 Checking collection: ${collectionName}`)
  
  // Get existing collections
  const response = await client.listMetricCollections()
  const collections = response.data?.collections || []
  const existingNames = new Set(collections.map(c => c.name))
  
  if (!existingNames.has(collectionName)) {
    console.log(`  Creating collection: ${collectionName}`)
    
    const metricsToUse = metricNames || getMetricNames()
    
    try {
      await client.createMetricCollection({
        name: collectionName,
        multiTurn: false,
        metricSettings: metricsToUse.map(name => ({
          metric: { name },
          threshold: 0.6,
          includeReason: true,
        })),
      })
      
      console.log(`✅ Collection created: ${collectionName}`)
    } catch (error: any) {
      // Handle 409 conflict (collection already exists)
      if (error.message?.includes('409') || error.message?.includes('already exists')) {
        console.log(`✓ Collection already exists: ${collectionName}`)
      } else {
        throw error
      }
    }
  } else {
    console.log(`✓ Collection exists: ${collectionName}`)
  }
}

/**
 * Full setup - ensures all metrics and collections are ready
 */
export async function setupConfidentAI(): Promise<void> {
  console.log('\n🔧 Setting up Confident AI...\n')
  
  // First ensure metrics exist
  await ensureMetricsExist()
  
  // Then create collections
  await ensureCollectionExists(STORYTELLER_COLLECTION_NAME)
  
  // Create a quick collection with ALL scientific metrics
  await ensureCollectionExists(STORYTELLER_QUICK_COLLECTION, [
    'EQ-Bench Magic Score',
    'Anti-Slop Score', 
    'EQ-Bench Consistency',
    'Mazur Character Voice',
    'Mazur Narrative Coherence',
    'Gilligan-Martin Quality',
  ])
  
  console.log('\n✅ Confident AI setup complete!\n')
}

/**
 * Get collection names
 */
export function getCollectionNames() {
  return {
    full: STORYTELLER_COLLECTION_NAME,
    quick: STORYTELLER_QUICK_COLLECTION,
  }
}
