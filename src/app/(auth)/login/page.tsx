'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LANDING_HERO_HEADLINES,
  LandingHeroAbVariant,
  LandingLoginBrandCopy,
  LandingNavUiCopy,
  MarketingVoiceLine,
  TurbulentBackground,
  VoiceLineAlign,
} from '@/domains/marketing'
import { TURBULENT_BG_PROPS } from '@/shared/data/constants/visuals'
import {
  AuthPageView,
  AuthTab,
  LoginFormCopy,
} from '@/shared/auth/constants/auth-messages'
import { LoginAuthPanel } from '@/app/(auth)/login/LoginAuthPanel'
import { useLoginForms } from '@/app/(auth)/login/useLoginForms'

type View = AuthPageView

const BRAND_MODULES = [
  LandingLoginBrandCopy.ModuleStoryteller,
  LandingLoginBrandCopy.ModuleWorlds,
  LandingLoginBrandCopy.ModuleCanvas,
  LandingLoginBrandCopy.ModuleLoops,
  LandingLoginBrandCopy.ModuleExport,
] as const

const HEADLINE = LANDING_HERO_HEADLINES[LandingHeroAbVariant.A]

function formHeading(view: View, authTab: AuthTab): { title: string; subtitle: string } {
  if (view === AuthPageView.ForgotPassword) {
    return {
      title: LoginFormCopy.ResetTitle,
      subtitle: LoginFormCopy.ResetSubtitle,
    }
  }
  if (authTab === AuthTab.SignUp) {
    return {
      title: LoginFormCopy.SignUpTitle,
      subtitle: LoginFormCopy.SignUpSubtitle,
    }
  }
  return {
    title: LoginFormCopy.SignInTitle,
    subtitle: LoginFormCopy.SignInSubtitle,
  }
}

export default function LoginPage() {
  const [view, setView] = useState<View>(AuthPageView.Auth)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authTab, setAuthTab] = useState<AuthTab>(AuthTab.SignIn)

  const { signInForm, signUpForm, forgotForm } = useLoginForms({
    setAuthError,
    setSuccessMessage,
  })

  const heading = formHeading(view, authTab)

  return (
    <TurbulentBackground {...TURBULENT_BG_PROPS}>
      <div className="flex min-h-screen w-full">
        <aside className="relative flex min-w-[400px] flex-[1_1_auto] overflow-hidden [animation:login-rise_0.6s_ease-out] [container-type:inline-size]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_90%_at_22%_38%,hsl(235_88%_65%/0.18)_0%,hsl(258_70%_40%/0.08)_38%,transparent_74%)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(100deg,rgba(9,9,11,0.05),rgba(9,9,11,0.28)_58%,rgba(9,9,11,0.72))]"
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-14">
            <Link href="/" prefetch={false} className="inline-flex w-fit">
              <img
                src="/logo.png"
                alt={LandingNavUiCopy.LogoAlt}
                className="h-auto w-[148px] object-contain"
                width={148}
                height={26}
              />
            </Link>

            <div className="flex max-w-xl flex-col gap-[26px]">
              <MarketingVoiceLine align={VoiceLineAlign.Start} />
              <h1 className="font-syne text-[clamp(28px,7.4cqi,74px)] font-extrabold uppercase leading-[0.88] tracking-[-0.035em] text-white">
                <span className="block">{HEADLINE.line1}</span>
                <span className="block">{HEADLINE.line2}</span>
                <span className="block text-[hsl(235_88%_70%)]">{HEADLINE.line3}</span>
              </h1>
              <p className="max-w-[430px] font-sans text-[17px] leading-[1.55] text-white/60">
                {LandingLoginBrandCopy.SubCopy}
              </p>
            </div>

            <div className="flex flex-wrap gap-[26px] border-t border-white/10 pt-5">
              {BRAND_MODULES.map(name => (
                <span
                  key={name}
                  className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/[0.38]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex flex-[0_0_clamp(440px,40%,600px)] flex-col justify-center border-l border-[hsl(240_3.7%_15.9%)] bg-[hsl(240_10%_3.9%)] p-10 [animation:login-rise_0.6s_ease-out_0.08s_both]">
          <Link
            href="/"
            prefetch={false}
            className="absolute bottom-10 left-12 font-mono text-[11px] uppercase tracking-[0.16em] text-white/[0.35] transition-colors hover:text-white/60"
          >
            {LandingLoginBrandCopy.BackHome}
          </Link>

          {view === AuthPageView.Auth && authTab === AuthTab.SignIn ? (
            <button
              type="button"
              onClick={() => setAuthTab(AuthTab.SignUp)}
              className="absolute right-12 top-10 text-[13px] text-white/40 transition-colors hover:text-white/70"
            >
              {LandingLoginBrandCopy.NewHere}
            </button>
          ) : null}

          <div className="mx-auto flex w-[380px] flex-col gap-[30px]">
            <div className="flex flex-col gap-[9px]">
              <h2 className="font-mono text-[28px] font-bold tracking-[-0.03em] text-white">
                {heading.title}
              </h2>
              <p className="font-sans text-[14px] leading-[1.5] text-[hsl(240_5%_64.9%)]">
                {heading.subtitle}
              </p>
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
              authTab={authTab}
              onAuthTabChange={setAuthTab}
            />
          </div>
        </section>
      </div>
    </TurbulentBackground>
  )
}
