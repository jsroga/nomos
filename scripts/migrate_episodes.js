const { Client } = require('pg')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  })

  try {
    await client.connect()
    console.log('Connected to DB')

    console.log('Adding poster_url column to episodes...')
    await client.query('ALTER TABLE episodes ADD COLUMN IF NOT EXISTS poster_url text;')

    console.log('Adding poster_prompt column to episodes...')
    await client.query('ALTER TABLE episodes ADD COLUMN IF NOT EXISTS poster_prompt text;')

    console.log('Migration successful!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrate()
