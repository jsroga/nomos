/**
 * Run Bible Lock Migration
 *
 * This script applies the Bible lock system migration to your database.
 * Run with: npx tsx scripts/run-bible-lock-migration.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function runMigration() {
  console.log('🔧 Starting Bible Lock Migration...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Step 1: Check if series_bibles table exists
    console.log('1️⃣ Checking if series_bibles table exists...')
    const { data: tables, error: tableError } = await supabase
      .from('series_bibles')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('❌ series_bibles table not found!')
      console.error('   Error:', tableError.message)
      process.exit(1)
    }

    console.log('✅ series_bibles table exists\n')

    // Step 2: Add lock columns
    console.log('2️⃣ Adding lock columns (is_locked, locked_by, locked_at)...')

    const migration = `
      -- Add lock fields to series_bibles table
      ALTER TABLE series_bibles
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS locked_by TEXT,
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

      -- Create index for locked Bibles
      CREATE INDEX IF NOT EXISTS idx_series_bibles_locked ON series_bibles(is_locked) WHERE is_locked = TRUE;

      -- Add comments
      COMMENT ON COLUMN series_bibles.is_locked IS 'Whether the Bible is locked (only central users can edit when locked)';
      COMMENT ON COLUMN series_bibles.locked_by IS 'Email of the user who locked the Bible';
      COMMENT ON COLUMN series_bibles.locked_at IS 'Timestamp when the Bible was locked';
    `

    const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migration })

    if (migrationError) {
      // Try alternative approach - add columns one by one
      console.log('⚠️  Direct SQL failed, trying column-by-column approach...\n')

      // This approach works without custom SQL functions
      // We'll just verify the columns exist by trying to query them
      const { error: testError } = await supabase
        .from('series_bibles')
        .select('is_locked, locked_by, locked_at')
        .limit(1)

      if (testError) {
        console.log("⚠️  Columns don't exist yet. Manual SQL migration required.")
        console.log('\n📝 Run this SQL in your Supabase dashboard:\n')
        console.log('```sql')
        console.log(migration)
        console.log('```\n')

        console.log('Or use Supabase CLI:')
        console.log('  supabase migration new add_bible_lock')
        console.log('  (paste the SQL above)')
        console.log('  supabase db push\n')

        process.exit(1)
      }

      console.log('✅ Columns already exist or were added successfully\n')
    } else {
      console.log('✅ Columns added successfully\n')
    }

    // Step 3: Verify migration
    console.log('3️⃣ Verifying migration...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('series_bibles')
      .select('id, project_id, is_locked, locked_by, locked_at')
      .limit(1)

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message)
      process.exit(1)
    }

    console.log('✅ Migration verified\n')

    // Step 4: Show current status
    const { data: allBibles, error: allError } = await supabase
      .from('series_bibles')
      .select('project_id, is_locked, locked_by, locked_at')

    if (!allError && allBibles) {
      console.log('📊 Current Bible Lock Status:')
      console.log(`   Total Bibles: ${allBibles.length}`)
      console.log(`   Locked: ${allBibles.filter(b => b.is_locked).length}`)
      console.log(`   Unlocked: ${allBibles.filter(b => !b.is_locked).length}\n`)

      const locked = allBibles.filter(b => b.is_locked)
      if (locked.length > 0) {
        console.log('🔒 Locked Bibles:')
        locked.forEach(b => {
          console.log(`   - Project: ${b.project_id}`)
          console.log(`     Locked by: ${b.locked_by}`)
          console.log(`     Locked at: ${b.locked_at}\n`)
        })
      }
    }

    console.log('✅ Migration complete!\n')
    console.log('ℹ️  Central users can now lock/unlock Bibles in the UI.')
    console.log(
      `ℹ️  Central users: ${process.env.NEXT_PUBLIC_CENTRAL_USERS || 'jacek.sroga.itc@gmail.com'}\n`
    )
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
