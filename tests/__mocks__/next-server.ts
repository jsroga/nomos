/**
 * Minimal mock for next/server when running Vitest without Next.js installed.
 */

export class NextRequest extends Request {}

export const NextResponse = {
  json: (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    }),
  next: (init?: ResponseInit) => new Response(null, { ...init, status: 308 }),
}
