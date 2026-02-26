import dotenv from 'dotenv'
import pg from 'pg'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
    const client = await pool.connect()
    try {
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'entity_references';
    `)

        if (res.rows.length > 0) {
            console.log('✅ Table "entity_references" EXISTS.')
        } else {
            console.log('❌ Table "entity_references" DOES NOT EXIST.')

            // Attempt generic list to see what IS there
            const allTables = await client.query(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
      `)
            console.log('Current tables:', allTables.rows.map(r => r.table_name).join(', '))
        }

    } catch (err) {
        console.error('Error querying information_schema:', err)
    } finally {
        client.release()
        await pool.end()
    }
}

main()
