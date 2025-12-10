import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Applying character metrics redesign migration...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/20251203214000_redesign_character_metrics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    try {
        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 60)}...`);
            await db.execute(sql.raw(statement));
        }
        console.log('✅ Migration applied successfully!');
    } catch (error) {
        console.error('❌ Failed to apply migration:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
