import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/db'

/**
 * @openapi
 * /api/storyteller/projects:
 *   get:
 *     summary: List all projects
 *     description: Retrieves all storyteller projects
 *     tags:
 *       - Storyteller Projects
 *     responses:
 *       200:
 *         description: A list of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   seriesBible:
 *                     type: object
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new project
 *     description: Creates a new storyteller project
 *     tags:
 *       - Storyteller Projects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Project name
 *               description:
 *                 type: string
 *                 description: Project description
 *               seriesBible:
 *                 type: object
 *                 description: Series bible configuration
 *     responses:
 *       200:
 *         description: The created project
 *       500:
 *         description: Server error
 */

import { requireAuth } from '@/lib/auth'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, seriesBible } = body

    const [newProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        name,
        description,
        seriesBible: seriesBible || {},
      })
      .returning()

    return NextResponse.json(newProject)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { session, error } = await requireAuth()
    if (error || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allProjects = await db.select().from(projects).where(eq(projects.userId, session.user.id))

    return NextResponse.json(allProjects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
