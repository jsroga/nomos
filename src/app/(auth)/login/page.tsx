'use client'

import { useState } from 'react'
import { BleedingText } from '@/components/BleedingText'
import { TurbulentBackground } from '@/domains/marketing'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import { AuthPageView } from '@/shared/auth/constants/auth-messages'
import { LoginAuthPanel } from '@/app/(auth)/login/LoginAuthPanel'
import { useLoginForms } from '@/app/(auth)/login/useLoginForms'

type View = AuthPageView

export default function LoginPage() {
  const [view, setView] = useState<View>(AuthPageView.Auth)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const { signInForm, signUpForm, forgotForm } = useLoginForms({
    setAuthError,
    setSuccessMessage,
  })

  return (
    <TurbulentBackground {...TURBULENT_BG_PROPS}>
      <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <div className="p-8 h-full flex flex-col justify-center bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex flex-col items-center space-y-2 text-center mb-8">
              <img src="/logo.svg" alt="KUR" className="w-32 h-auto drop-shadow-lg mb-2" />
              <h1 className="text-sm font-bold tracking-tight">
                <BleedingText
                  text="Build worlds that bleed"
                  className="uppercase font-syne"
                  textColor="text-red-500"
                  particleColor="text-red-600"
                />
              </h1>
            </div>

            <LoginAuthPanel
              view={view}
              setView={setView}
              authError={authError}
              setAuthError={setAuthError}
              successMessage={successMessage}
              setSuccessMessage={setSuccessMessage}
              signInForm={signInForm}
              signUpForm={signUpForm}
              forgotForm={forgotForm}
            />
          </div>
        </div>
      </div>
    </TurbulentBackground>
  )
}
