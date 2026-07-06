'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormik } from 'formik'
import LoginButton from '@/components/auth/LoginButton'
import { BleedingText } from '@/components/ui/BleedingText'
import { Liquid } from '@/domains/marketing'
import { TurbulentBackground } from '@/domains/marketing'
import { TURBULENT_BG_PROPS, LIQUID_PROPS } from '@/lib/constants/visuals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signInSchema, signUpSchema, forgotPasswordSchema } from '@/shared/auth/validation'

type View = 'auth' | 'forgot-password'

export default function LoginPage() {
  const router = useRouter()
  const [bgElement, setBgElement] = useState<HTMLDivElement | null>(null)
  const [view, setView] = useState<View>('auth')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Live Texture Bridge: continuously update liquidGL texture from the background canvas
  useEffect(() => {
    let rafId: number

    const updateTexture = () => {
      const bgCanvas = document.getElementById('turbulent-bg-canvas') as HTMLCanvasElement
      const renderer = (window as any).__liquidGLRenderer__

      if (bgCanvas && renderer && renderer._uploadTexture) {
        renderer._uploadTexture(bgCanvas)
      }
      rafId = requestAnimationFrame(updateTexture)
    }

    rafId = requestAnimationFrame(updateTexture)

    return () => cancelAnimationFrame(rafId)
  }, [])

  // Sign In form
  const signInForm = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: signInSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) {
          setAuthError(data.error || 'Sign in failed')
          return
        }
        router.push('/app')
        router.refresh()
      } catch {
        setAuthError('Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
  })

  // Sign Up form
  const signUpForm = useFormik({
    initialValues: { email: '', password: '', confirmPassword: '' },
    validationSchema: signUpSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) {
          setAuthError(data.error || 'Sign up failed')
          return
        }
        setSuccessMessage('Check your email to confirm your account.')
      } catch {
        setAuthError('Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
  })

  // Forgot Password form
  const forgotForm = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) {
          const data = await res.json()
          setAuthError(data.error || 'Failed to send reset link')
          return
        }
        setSuccessMessage('If an account exists with that email, a password reset link has been sent.')
      } catch {
        setAuthError('Something went wrong. Please try again.')
      } finally {
        setSubmitting(false)
      }
    },
  })

  const inputClassName =
    'bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30'
  const errorClassName = 'text-red-400 text-xs mt-1'

  return (
    <TurbulentBackground onRef={setBgElement} {...TURBULENT_BG_PROPS}>
      <div className="flex min-h-screen w-full items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
          <Liquid snapshot={bgElement} {...LIQUID_PROPS}>
            <div className="p-8 h-full flex flex-col justify-center bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
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

              {/* Success message */}
              {successMessage && (
                <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
                  {successMessage}
                  <button
                    onClick={() => {
                      setSuccessMessage(null)
                      setView('auth')
                    }}
                    className="block mx-auto mt-2 text-xs text-white/60 hover:text-white underline"
                  >
                    Back to sign in
                  </button>
                </div>
              )}

              {/* Auth error */}
              {authError && !successMessage && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {authError}
                </div>
              )}

              {!successMessage && (
                <div className="space-y-6">
                  {view === 'auth' ? (
                    <>
                      <Tabs
                        defaultValue="signin"
                        className="w-full"
                        onValueChange={() => setAuthError(null)}
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 mb-6">
                          <TabsTrigger
                            value="signin"
                            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
                          >
                            Sign In
                          </TabsTrigger>
                          <TabsTrigger
                            value="signup"
                            className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60"
                          >
                            Sign Up
                          </TabsTrigger>
                        </TabsList>

                        {/* Sign In Tab */}
                        <TabsContent value="signin" className="space-y-4">
                          <form onSubmit={signInForm.handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="signin-email" className="text-white/80">
                                Email
                              </Label>
                              <Input
                                id="signin-email"
                                type="email"
                                placeholder="m@example.com"
                                className={inputClassName}
                                {...signInForm.getFieldProps('email')}
                              />
                              {signInForm.touched.email && signInForm.errors.email && (
                                <p className={errorClassName}>{signInForm.errors.email}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="signin-password" className="text-white/80">
                                  Password
                                </Label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setView('forgot-password')
                                    setAuthError(null)
                                  }}
                                  className="text-xs text-white/50 hover:text-white transition-colors"
                                >
                                  Forgot password?
                                </button>
                              </div>
                              <Input
                                id="signin-password"
                                type="password"
                                className={inputClassName}
                                {...signInForm.getFieldProps('password')}
                              />
                              {signInForm.touched.password && signInForm.errors.password && (
                                <p className={errorClassName}>{signInForm.errors.password}</p>
                              )}
                            </div>
                            <Button
                              type="submit"
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                              size="lg"
                              disabled={signInForm.isSubmitting}
                            >
                              {signInForm.isSubmitting ? 'Signing in...' : 'Sign In'}
                            </Button>
                          </form>
                        </TabsContent>

                        {/* Sign Up Tab */}
                        <TabsContent value="signup" className="space-y-4">
                          <form onSubmit={signUpForm.handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="signup-email" className="text-white/80">
                                Email
                              </Label>
                              <Input
                                id="signup-email"
                                type="email"
                                placeholder="m@example.com"
                                className={inputClassName}
                                {...signUpForm.getFieldProps('email')}
                              />
                              {signUpForm.touched.email && signUpForm.errors.email && (
                                <p className={errorClassName}>{signUpForm.errors.email}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-password" className="text-white/80">
                                Password
                              </Label>
                              <Input
                                id="signup-password"
                                type="password"
                                className={inputClassName}
                                {...signUpForm.getFieldProps('password')}
                              />
                              {signUpForm.touched.password && signUpForm.errors.password && (
                                <p className={errorClassName}>{signUpForm.errors.password}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-confirm-password" className="text-white/80">
                                Confirm Password
                              </Label>
                              <Input
                                id="signup-confirm-password"
                                type="password"
                                className={inputClassName}
                                {...signUpForm.getFieldProps('confirmPassword')}
                              />
                              {signUpForm.touched.confirmPassword &&
                                signUpForm.errors.confirmPassword && (
                                  <p className={errorClassName}>
                                    {signUpForm.errors.confirmPassword}
                                  </p>
                                )}
                            </div>
                            <Button
                              type="submit"
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                              size="lg"
                              disabled={signUpForm.isSubmitting}
                            >
                              {signUpForm.isSubmitting ? 'Creating account...' : 'Create Account'}
                            </Button>
                          </form>
                        </TabsContent>
                      </Tabs>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-transparent px-2 text-white/40">
                            Or continue with
                          </span>
                        </div>
                      </div>

                      <LoginButton />
                    </>
                  ) : (
                    /* Forgot Password View */
                    <form onSubmit={forgotForm.handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-white text-center">
                          Reset Password
                        </h2>
                        <p className="text-sm text-white/50 text-center">
                          Enter your email and we&apos;ll send you a reset link.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email" className="text-white/80">
                          Email
                        </Label>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="m@example.com"
                          className={inputClassName}
                          {...forgotForm.getFieldProps('email')}
                        />
                        {forgotForm.touched.email && forgotForm.errors.email && (
                          <p className={errorClassName}>{forgotForm.errors.email}</p>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        size="lg"
                        disabled={forgotForm.isSubmitting}
                      >
                        {forgotForm.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setView('auth')
                          setAuthError(null)
                        }}
                        className="w-full text-sm text-white/50 hover:text-white transition-colors"
                      >
                        Back to sign in
                      </button>
                    </form>
                  )}

                  <p className="text-[10px] text-center text-white/30 leading-tight px-4 pt-2">
                    By signing up, you agree to our{' '}
                    <a
                      href="/terms"
                      className="hover:text-white underline decoration-white/30 underline-offset-2"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      className="hover:text-white underline decoration-white/30 underline-offset-2"
                    >
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </Liquid>
        </div>
      </div>
    </TurbulentBackground>
  )
}
