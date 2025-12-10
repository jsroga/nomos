import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role key for admin access

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.log('Please set SUPABASE_SERVICE_ROLE_KEY in your environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const targetEmail = 'jacek.sroga.itc@gmail.com'

async function migrate() {
  // 1. Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  
  if (userError) {
    console.error('Error fetching users:', userError)
    process.exit(1)
  }

  const targetUser = users.users.find(u => u.email === targetEmail)
  
  if (!targetUser) {
    console.error(`User with email ${targetEmail} not found`)
    process.exit(1)
  }

  console.log(`Found user: ${targetUser.id} (${targetUser.email})`)

  // 2. Update all projects without user_id or with NULL user_id
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, user_id')

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
    process.exit(1)
  }

  console.log(`Found ${projects.length} projects`)

  for (const project of projects) {
    if (!project.user_id) {
      console.log(`Updating project "${project.name}" (${project.id})...`)
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ user_id: targetUser.id })
        .eq('id', project.id)

      if (updateError) {
        console.error(`  Error updating project ${project.id}:`, updateError)
      } else {
        console.log(`  ✓ Updated`)
      }
    } else {
      console.log(`Project "${project.name}" already has user_id: ${project.user_id}`)
    }
  }

  // 3. Update all assets without user_id
  const { data: assets, error: assetsError } = await supabase
    .from('assets')
    .select('id, user_id')

  if (!assetsError && assets) {
    console.log(`\nFound ${assets.length} assets`)
    
    for (const asset of assets) {
      if (!asset.user_id) {
        const { error: updateError } = await supabase
          .from('assets')
          .update({ user_id: targetUser.id })
          .eq('id', asset.id)

        if (updateError) {
          console.error(`  Error updating asset ${asset.id}:`, updateError)
        } else {
          console.log(`  ✓ Updated asset ${asset.id}`)
        }
      }
    }
  }

  console.log('\n✓ Migration complete!')
}

migrate()

