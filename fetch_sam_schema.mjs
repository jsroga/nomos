import Replicate from 'replicate'

const replicate = new Replicate({
  auth: 'r8_AyTsTyyY0gfjFkljVlx3jnMgyBjUvtD1vsI1A', // User provided key
})

async function main() {
  const models = [['meta', 'sam-2-video']]

  for (const [owner, name] of models) {
    try {
      console.log(`Checking ${owner}/${name}...`)
      const versions = await replicate.models.versions.list(owner, name)
      if (versions && versions.results) {
        const v = versions.results[0]
        console.log(`VERSION ${v.id}:`)
        console.log(
          'SCHEMA:',
          JSON.stringify(v.openapi_schema?.components?.schemas?.Input, null, 2)
        )
      }
    } catch (error) {
      console.log(`Failed ${owner}/${name}:`, error.message || error)
    }
  }
}

main()
