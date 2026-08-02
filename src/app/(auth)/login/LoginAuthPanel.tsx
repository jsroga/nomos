'use client'

import type { FormikProps } from 'formik'
import { AuthPageView, AuthTab } from '@/shared/auth/constants/auth-messages'
import { LOGIN_PAGE_STYLES } from '@/app/(auth)/constants/auth-styles'
import {
  LoginAuthTabs,
  LoginForgotPasswordForm,
  LoginTermsFooter,
  type ForgotValues,
  type SignInValues,
  type SignUpValues,
} from './LoginAuthPanelForms'

interface LoginAuthPanelProps {
  view: AuthPageView
  setView: (view: AuthPageView) => void
  authError: string | null
  setAuthError: (message: string | null) => void
  successMessage: string | null
  setSuccessMessage: (message: string | null) => void
  signInForm: FormikProps<SignInValues>
  signUpForm: FormikProps<SignUpValues>
  forgotForm: FormikProps<ForgotValues>
  authTab: AuthTab
  onAuthTabChange: (tab: AuthTab) => void
}

function LoginSuccessBanner({
  message,
  onBackToSignIn,
}: {
  message: string
  onBackToSignIn: () => void
}) {
  return (
    <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center text-sm text-green-400">
      {message}
      <button
        onClick={onBackToSignIn}
        className="mx-auto mt-2 block text-xs text-white/60 underline hover:text-white"
      >
        Back to sign in
      </button>
    </div>
  )
}

function LoginErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
      {message}
    </div>
  )
}

export function LoginAuthPanel({
  view,
  setView,
  authError,
  setAuthError,
  successMessage,
  setSuccessMessage,
  signInForm,
  signUpForm,
  forgotForm,
  authTab,
  onAuthTabChange,
}: LoginAuthPanelProps) {
  const inputClassName = LOGIN_PAGE_STYLES.INPUT
  const errorClassName = LOGIN_PAGE_STYLES.ERROR

  const handleBackToSignIn = () => {
    setView(AuthPageView.Auth)
    setAuthError(null)
  }

  const handleForgotPassword = () => {
    setView(AuthPageView.ForgotPassword)
    setAuthError(null)
  }

  const handleSuccessDismiss = () => {
    setSuccessMessage(null)
    setView(AuthPageView.Auth)
  }

  return (
    <>
      {successMessage ? (
        <LoginSuccessBanner message={successMessage} onBackToSignIn={handleSuccessDismiss} />
      ) : null}

      {authError && !successMessage ? <LoginErrorBanner message={authError} /> : null}

      {!successMessage ? (
        <div className="space-y-[30px]">
          {view === AuthPageView.Auth ? (
            <LoginAuthTabs
              signInForm={signInForm}
              signUpForm={signUpForm}
              inputClassName={inputClassName}
              errorClassName={errorClassName}
              onClearError={() => setAuthError(null)}
              onForgotPassword={handleForgotPassword}
              authTab={authTab}
              onAuthTabChange={onAuthTabChange}
            />
          ) : (
            <LoginForgotPasswordForm
              form={forgotForm}
              inputClassName={inputClassName}
              errorClassName={errorClassName}
              onBackToSignIn={handleBackToSignIn}
            />
          )}

          <LoginTermsFooter />
        </div>
      ) : null}
    </>
  )
}
