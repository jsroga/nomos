
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to DB for check');

        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'episodes';
    `);

        const columns = res.rows.map(r => r.column_name);
        console.log('Columns in episodes:', columns);

        if (columns.includes('poster_url')) {
            console.log('✅ poster_url exists');
        } else {
            console.log('❌ poster_url MISSING');
        }

        if (columns.includes('poster_prompt')) {
            console.log('✅ poster_prompt exists');
        } else {
            console.log('❌ poster_prompt MISSING');
        }

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
