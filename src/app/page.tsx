import { LandingPage } from '@/domains/marketing/components/LandingPage'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function Page() {
  // If user is logged in, restrict access if not admin, or direct to App?
  // Current logic: Landing Page is public. If they want to go to App, they click "Sign In".
  // If they are ALREADY signed in, we could redirect them to /app.

  const cookieStore = await cookies()
  // @ts-expect-error - Next 15 cookies are async
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Optional: Redirect to /app if already logged in?
    // User request: "app part should be accessible via ../app/module"
    // If we redirect automatically, they can't see the landing page.
    // Better to check "Sign In" button behavior on Landing Page.
  }

  return <LandingPage isLoggedIn={!!session} />
}
