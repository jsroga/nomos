'use client'

import type { ReactNode } from 'react'
import type { FieldInputProps, FormikProps } from 'formik'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import LoginButton from '@/components/LoginButton'
import { LOGIN_PAGE_STYLES } from '@/app/(auth)/constants/auth-styles'
import { AuthTab, LoginFormCopy } from '@/shared/auth/constants/auth-messages'

interface SignInValues {
  email: string
  password: string
}

interface SignUpValues {
  email: string
  password: string
  confirmPassword: string
}

interface ForgotValues {
  email: string
}

interface FormFieldProps {
  id: string
  label: string
  type: string
  placeholder?: string
  inputClassName: string
  errorClassName: string
  touched: boolean | undefined
  error: string | undefined
  fieldProps: FieldInputProps<string>
  labelExtra?: ReactNode
}

function FormField({
  id,
  label,
  type,
  placeholder,
  inputClassName,
  errorClassName,
  touched,
  error,
  fieldProps,
  labelExtra,
}: FormFieldProps) {
  return (
    <div className="space-y-[9px]">
      <div className={labelExtra ? 'flex items-center justify-between' : undefined}>
        <Label htmlFor={id} className={LOGIN_PAGE_STYLES.LABEL}>
          {label}
        </Label>
        {labelExtra}
      </div>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        className={inputClassName}
        {...fieldProps}
      />
      {touched && error ? <p className={errorClassName}>{error}</p> : null}
    </div>
  )
}

interface LoginSignInFormProps {
  form: FormikProps<SignInValues>
  inputClassName: string
  errorClassName: string
  onForgotPassword: () => void
}

export function LoginSignInForm({
  form,
  inputClassName,
  errorClassName,
  onForgotPassword,
}: LoginSignInFormProps) {
  return (
    <form onSubmit={form.handleSubmit} className="space-y-[18px]">
      <FormField
        id="signin-email"
        label="Email"
        type="email"
        placeholder="m@example.com"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.email}
        error={form.errors.email}
        fieldProps={form.getFieldProps('email')}
      />
      <FormField
        id="signin-password"
        label="Password"
        type="password"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.password}
        error={form.errors.password}
        fieldProps={form.getFieldProps('password')}
        labelExtra={
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[12px] text-[hsl(235_88%_65%)] transition-colors hover:text-[hsl(235_88%_71%)]"
          >
            {LoginFormCopy.Forgot}
          </button>
        }
      />
      <Button type="submit" className={LOGIN_PAGE_STYLES.SUBMIT} disabled={form.isSubmitting}>
        {form.isSubmitting ? LoginFormCopy.SignInSubmitting : LoginFormCopy.SignInSubmit}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Button>
    </form>
  )
}

interface LoginSignUpFormProps {
  form: FormikProps<SignUpValues>
  inputClassName: string
  errorClassName: string
}

export function LoginSignUpForm({ form, inputClassName, errorClassName }: LoginSignUpFormProps) {
  return (
    <form onSubmit={form.handleSubmit} className="space-y-[18px]">
      <FormField
        id="signup-email"
        label="Email"
        type="email"
        placeholder="m@example.com"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.email}
        error={form.errors.email}
        fieldProps={form.getFieldProps('email')}
      />
      <FormField
        id="signup-password"
        label="Password"
        type="password"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.password}
        error={form.errors.password}
        fieldProps={form.getFieldProps('password')}
      />
      <FormField
        id="signup-confirm-password"
        label="Confirm Password"
        type="password"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.confirmPassword}
        error={form.errors.confirmPassword}
        fieldProps={form.getFieldProps('confirmPassword')}
      />
      <Button type="submit" className={LOGIN_PAGE_STYLES.SUBMIT} disabled={form.isSubmitting}>
        {form.isSubmitting ? LoginFormCopy.SignUpSubmitting : LoginFormCopy.SignUpSubmit}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Button>
    </form>
  )
}

interface LoginAuthTabsProps {
  signInForm: FormikProps<SignInValues>
  signUpForm: FormikProps<SignUpValues>
  inputClassName: string
  errorClassName: string
  onClearError: () => void
  onForgotPassword: () => void
  authTab: AuthTab
  onAuthTabChange: (tab: AuthTab) => void
}

export function LoginAuthTabs({
  signInForm,
  signUpForm,
  inputClassName,
  errorClassName,
  onClearError,
  onForgotPassword,
  authTab,
  onAuthTabChange,
}: LoginAuthTabsProps) {
  const handleTab = (tab: AuthTab) => {
    onClearError()
    onAuthTabChange(tab)
  }

  return (
    <div className="flex flex-col gap-[30px]">
      <LoginButton />

      <div className="flex items-center gap-3.5">
        <span className="h-px flex-1 bg-white/10" />
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.24em] text-white/[0.32]">
          {LoginFormCopy.DividerEmail}
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {authTab === AuthTab.SignIn ? (
        <LoginSignInForm
          form={signInForm}
          inputClassName={inputClassName}
          errorClassName={errorClassName}
          onForgotPassword={onForgotPassword}
        />
      ) : (
        <LoginSignUpForm
          form={signUpForm}
          inputClassName={inputClassName}
          errorClassName={errorClassName}
        />
      )}

      {authTab === AuthTab.SignUp ? (
        <button
          type="button"
          onClick={() => handleTab(AuthTab.SignIn)}
          className="text-center text-[13px] text-white/40 transition-colors hover:text-white/70"
        >
          {LoginFormCopy.AlreadyHaveAccount}
        </button>
      ) : null}
    </div>
  )
}

interface LoginForgotPasswordFormProps {
  form: FormikProps<ForgotValues>
  inputClassName: string
  errorClassName: string
  onBackToSignIn: () => void
}

export function LoginForgotPasswordForm({
  form,
  inputClassName,
  errorClassName,
  onBackToSignIn,
}: LoginForgotPasswordFormProps) {
  return (
    <form onSubmit={form.handleSubmit} className="space-y-[18px]">
      <div className="sr-only space-y-[9px]">
        <h2>{LoginFormCopy.ResetTitle}</h2>
        <p>{LoginFormCopy.ResetSubtitle}</p>
      </div>
      <FormField
        id="forgot-email"
        label="Email"
        type="email"
        placeholder="m@example.com"
        inputClassName={inputClassName}
        errorClassName={errorClassName}
        touched={form.touched.email}
        error={form.errors.email}
        fieldProps={form.getFieldProps('email')}
      />
      <Button type="submit" className={LOGIN_PAGE_STYLES.SUBMIT} disabled={form.isSubmitting}>
        {form.isSubmitting ? LoginFormCopy.ResetSubmitting : LoginFormCopy.ResetSubmit}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Button>
      <button
        type="button"
        onClick={onBackToSignIn}
        className="w-full font-mono text-[11px] uppercase tracking-[0.16em] text-white/35 transition-colors hover:text-white/60"
      >
        {LoginFormCopy.BackToSignIn}
      </button>
    </form>
  )
}

export function LoginTermsFooter() {
  return (
    <p className="text-[11px] leading-[1.5] text-white/30">
      By signing up, you agree to our{' '}
      <a
        href="/terms"
        className="text-white/50 underline underline-offset-[3px] hover:text-white/70"
      >
        Terms of Service
      </a>{' '}
      and{' '}
      <a
        href="/privacy"
        className="text-white/50 underline underline-offset-[3px] hover:text-white/70"
      >
        Privacy Policy
      </a>
      .
    </p>
  )
}

export type { SignInValues, SignUpValues, ForgotValues }
