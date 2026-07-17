/** OpenAPI documentation for /api/storyteller/characters (kept out of route.ts for metrics). */
export const CHARACTERS_OPENAPI = `
 * @openapi
 * /api/storyteller/characters:
 *   get:
 *     summary: List characters
 *     description: Retrieves all characters for a project
 *     tags:
 *       - Storyteller Characters
 *     parameters:
 *       - name: projectId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID to filter characters
 *     responses:
 *       200:
 *         description: A list of characters
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a character
 *     tags:
 *       - Storyteller Characters
 *   patch:
 *     summary: Update a character
 *     tags:
 *       - Storyteller Characters
 *   delete:
 *     summary: Delete a character
 *     tags:
 *       - Storyteller Characters
`
