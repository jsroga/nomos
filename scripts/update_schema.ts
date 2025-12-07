import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Running manual schema update...');
    try {
        await db.execute(sql`ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "gender" text;`);
        await db.execute(sql`ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "character_prompt" text;`);
        await db.execute(sql`ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "description" text;`);
        await db.execute(sql`ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "portrait_url" text;`);
        console.log('Schema updated successfully.');
    } catch (error) {
        console.error('Failed to update schema:', error);
    }
    process.exit(0);
}

main();
