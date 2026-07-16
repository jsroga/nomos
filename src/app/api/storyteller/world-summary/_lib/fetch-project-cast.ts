import { characters } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'

export interface WorldSummaryCastMember {
  name: string
  role?: string
  description?: string
}

export async function fetchProjectCast(projectId: string): Promise<WorldSummaryCastMember[]> {
  const cast = await db
    .select({ name: characters.name, role: characters.role, description: characters.description })
    .from(characters)
    .where(eq(characters.projectId, projectId))

  return cast.map(member => ({
    name: member.name,
    role: member.role ?? undefined,
    description: member.description ?? undefined,
  }))
}
