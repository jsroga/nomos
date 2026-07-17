'use client'

import type { ReactNode } from 'react'
import type { FieldInputProps, FormikProps } from 'formik'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Tabs'
import LoginButton from '@/components/LoginButton'

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
    <div className="space-y-2">
      <div className={labelExtra ? 'flex items-center justify-between' : undefined}>
        <Label htmlFor={id} className="text-white/80">
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
      {touched && error && <p className={errorClassName}>{error}</p>}
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
    <form onSubmit={form.handleSubmit} className="space-y-4">
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
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            Forgot password?
          </button>
        }
      />
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-white"
        size="lg"
        disabled={form.isSubmitting}
      >
        {form.isSubmitting ? 'Signing in...' : 'Sign In'}
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
    <form onSubmit={form.handleSubmit} className="space-y-4">
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
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-white"
        size="lg"
        disabled={form.isSubmitting}
      >
        {form.isSubmitting ? 'Creating account...' : 'Create Account'}
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
}

export function LoginAuthTabs({
  signInForm,
  signUpForm,
  inputClassName,
  errorClassName,
  onClearError,
  onForgotPassword,
}: LoginAuthTabsProps) {
  return (
    <>
      <Tabs defaultValue="signin" className="w-full" onValueChange={onClearError}>
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

        <TabsContent value="signin" className="space-y-4">
          <LoginSignInForm
            form={signInForm}
            inputClassName={inputClassName}
            errorClassName={errorClassName}
            onForgotPassword={onForgotPassword}
          />
        </TabsContent>

        <TabsContent value="signup" className="space-y-4">
          <LoginSignUpForm
            form={signUpForm}
            inputClassName={inputClassName}
            errorClassName={errorClassName}
          />
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-white/40">Or continue with</span>
        </div>
      </div>

      <LoginButton />
    </>
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
    <form onSubmit={form.handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white text-center">Reset Password</h2>
        <p className="text-sm text-white/50 text-center">
          Enter your email and we&apos;ll send you a reset link.
        </p>
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
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-white"
        size="lg"
        disabled={form.isSubmitting}
      >
        {form.isSubmitting ? 'Sending...' : 'Send Reset Link'}
      </Button>
      <button
        type="button"
        onClick={onBackToSignIn}
        className="w-full text-sm text-white/50 hover:text-white transition-colors"
      >
        Back to sign in
      </button>
    </form>
  )
}

export function LoginTermsFooter() {
  return (
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
  )
}

export type { SignInValues, SignUpValues, ForgotValues }
