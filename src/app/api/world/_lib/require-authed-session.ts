import { connection } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'

export async function requireAuthedSession() {
  await connection()
  return requireAuth()
}
