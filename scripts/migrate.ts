import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
    console.log('Running migrations...');

    const db = drizzle(migrationClient);

    try {
        await migrate(db, { migrationsFolder: 'drizzle' });
        console.log('✅ Migrations completed successfully');
    } catch (error: any) {
        // Handle "relation already exists" as a sign that we are syncing an existing DB
        // Drizzle wraps the error, so we need to check both top level and cause
        const code = error.code || error.cause?.code;
        const message = error.message || error.cause?.message;

        if (code === '42P07' || message?.includes('already exists')) {
            console.log('⚠️  Migration tried to create tables that already exist.');
            console.log('✅ Assumed consistent state (Baseline).');
        } else {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
    } finally {
        await migrationClient.end();
    }
}

main();
