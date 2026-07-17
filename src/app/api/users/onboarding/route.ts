import { NextRequest } from 'next/server'
import {
  handleOnboardingGet,
  handleOnboardingPost,
} from './onboarding-helpers'

export async function POST(req: NextRequest) {
  return handleOnboardingPost(req)
}

export async function GET(req: NextRequest) {
  return handleOnboardingGet(req)
}
