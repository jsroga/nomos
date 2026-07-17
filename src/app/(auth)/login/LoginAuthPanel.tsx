'use client'

import type { FormikProps } from 'formik'
import { AuthPageView } from '@/shared/auth/constants/auth-messages'
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
}

function LoginSuccessBanner({
  message,
  onBackToSignIn,
}: {
  message: string
  onBackToSignIn: () => void
}) {
  return (
    <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
      {message}
      <button
        onClick={onBackToSignIn}
        className="block mx-auto mt-2 text-xs text-white/60 hover:text-white underline"
      >
        Back to sign in
      </button>
    </div>
  )
}

function LoginErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
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
      {successMessage && (
        <LoginSuccessBanner message={successMessage} onBackToSignIn={handleSuccessDismiss} />
      )}

      {authError && !successMessage && <LoginErrorBanner message={authError} />}

      {!successMessage && (
        <div className="space-y-6">
          {view === AuthPageView.Auth ? (
            <LoginAuthTabs
              signInForm={signInForm}
              signUpForm={signUpForm}
              inputClassName={inputClassName}
              errorClassName={errorClassName}
              onClearError={() => setAuthError(null)}
              onForgotPassword={handleForgotPassword}
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
      )}
    </>
  )
}
