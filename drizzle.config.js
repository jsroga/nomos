const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

module.exports = {
  schema: ['./src/db/schema.ts', './src/domains/storyteller/db/schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}
