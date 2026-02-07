
import * as fs from 'fs'
import * as path from 'path'
import * as glob from 'glob'

interface SkillMetadata {
    name: string
    description: string
    version: string
    tags: string[]
}

function parseFrontmatter(content: string): SkillMetadata | null {
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return null

    const frontmatter = match[1]
    const metadata: Partial<SkillMetadata> = {}

    frontmatter.split('\n').forEach(line => {
        const [key, ...values] = line.split(':')
        if (!key || values.length === 0) return

        const trimmedKey = key.trim() as keyof SkillMetadata
        let value = values.join(':').trim()

        if (trimmedKey === 'tags') {
            metadata.tags = []
            return
        }

        if (line.trim().startsWith('- ') && metadata.tags) {
            metadata.tags.push(line.trim().substring(2))
            return
        }

        if (['name', 'description', 'version'].includes(trimmedKey)) {
            // Remove quotes if present
            value = value.replace(/^["']|["']$/g, '')
                ; (metadata as any)[trimmedKey] = value
        }
    })

    return metadata as SkillMetadata
}

function validateSkills() {
    const skillsDir = path.resolve(process.cwd(), 'skills')
    console.log(`🔍 Validating skills in: ${skillsDir}`)

    const skillFiles = glob.sync('**/**/SKILL.md', { cwd: skillsDir, absolute: true })

    if (skillFiles.length === 0) {
        console.error('❌ No SKILL.md files found!')
        process.exit(1)
    }

    let errors = 0

    skillFiles.forEach(file => {
        const relativePath = path.relative(process.cwd(), file)
        const content = fs.readFileSync(file, 'utf-8')
        const metadata = parseFrontmatter(content)

        if (!metadata) {
            console.error(`❌ [${relativePath}] Missing or invalid YAML frontmatter`)
            errors++
            return
        }

        const missingFields = []
        if (!metadata.name) missingFields.push('name')
        if (!metadata.description) missingFields.push('description')
        if (!metadata.version) missingFields.push('version')

        if (missingFields.length > 0) {
            console.error(`❌ [${relativePath}] Missing required fields: ${missingFields.join(', ')}`)
            errors++
        } else {
            console.log(`✅ [${relativePath}] Valid (${metadata.name})`)
        }
    })

    if (errors > 0) {
        console.error(`\nFound ${errors} errors.`)
        process.exit(1)
    } else {
        console.log('\n✨ All skills validated successfully!')
    }
}

validateSkills()
