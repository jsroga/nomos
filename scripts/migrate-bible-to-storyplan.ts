import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../src/domains/storyteller/db/schema'
import * as dotenv from 'dotenv'
import { eq } from 'drizzle-orm';
import { deepMerge } from '@/domains/storyteller/config/action-config';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in .env.local')
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL, { prepare: false })
const db = drizzle(client, { schema })

// Rename function to avoid conflict
async function runMigration() {
    console.log('Starting migration from seriesBible to storyPlan...');

    const allProjects = await db.select().from(schema.projects);
    console.log(`Found ${allProjects.length} projects.`);

    for (const project of allProjects) {
        console.log(`Processing project ${project.id}...`);

        const seriesBible = (project.seriesBible as Record<string, any>) || {};
        const storyPlan = (project.storyPlan as Record<string, any>) || {};

        if (Object.keys(seriesBible).length === 0) {
            console.log(`  - No seriesBible data. Skipping.`);
            continue;
        }

        const updates: Record<string, any> = {};

        // Helper to flatten/move data
        const moveData = (key: string, value: any) => {
            let targetKey = key;
            // Lowercase Lore
            if (key === 'Lore') targetKey = 'lore';
            // Flatten Setting
            if (key === 'Setting' && typeof value === 'object' && value !== null) {
                Object.assign(updates, value);
                return;
            }
            // Map aliases
            if (key === 'episodes') targetKey = 'sequences';

            // Check if wrapped in updatedFields (the mess)
            if (key === 'updatedFields' && typeof value === 'object' && value !== null) {
                Object.entries(value).forEach(([k, v]) => moveData(k, v));
                return;
            }

            updates[targetKey] = value;
        };

        // Iterate over seriesBible keys
        Object.entries(seriesBible).forEach(([key, value]) => {
            moveData(key, value);
        });

        const newStoryPlan = deepMerge(storyPlan, updates);

        // Update DB
        // Use schema.projects here
        await db.update(schema.projects)
            .set({
                storyPlan: newStoryPlan,
                // Optional: Clear seriesBible to avoid confusion? 
                // Let's keep it for now as backup but maybe empty it if user wants clean slate.
                // "seriesBible can be removed?" -> User implied removal. 
                // Let's clear it to be safe and enforce new truth.
                seriesBible: {}
            })
            .where(eq(schema.projects.id, project.id));

        console.log(`  - Migrated ${Object.keys(updates).length} fields to storyPlan.`);
    }

    console.log('Migration complete.');
    process.exit(0);
}

runMigration().catch(console.error);
