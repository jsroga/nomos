'use client'

import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import { signInSchema, signUpSchema, forgotPasswordSchema } from '@/shared/auth/validation'
import { AUTH_MESSAGE } from '@/shared/auth/constants/auth-messages'
import { HttpMethod } from '@/shared/data/constants/protocol'

interface UseLoginFormsOptions {
  setAuthError: (message: string | null) => void
  setSuccessMessage: (message: string | null) => void
}

export function useLoginForms({ setAuthError, setSuccessMessage }: UseLoginFormsOptions) {
  const router = useRouter()

  const signInForm = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: signInSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/signin', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) {
          setAuthError(data.error || AUTH_MESSAGE.SIGN_IN_FAILED)
          return
        }
        router.push('/projects')
        router.refresh()
      } catch {
        setAuthError(AUTH_MESSAGE.RESET_PASSWORD_ERROR)
      } finally {
        setSubmitting(false)
      }
    },
  })

  const signUpForm = useFormik({
    initialValues: { email: '', password: '', confirmPassword: '' },
    validationSchema: signUpSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/signup', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        const data = await res.json()
        if (!res.ok) {
          setAuthError(data.error || AUTH_MESSAGE.SIGN_UP_FAILED)
          return
        }
        setSuccessMessage(AUTH_MESSAGE.CHECK_EMAIL_WITH_PERIOD)
      } catch {
        setAuthError(AUTH_MESSAGE.RESET_PASSWORD_ERROR)
      } finally {
        setSubmitting(false)
      }
    },
  })

  const forgotForm = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setAuthError(null)
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: HttpMethod.Post,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
        if (!res.ok) {
          const data = await res.json()
          setAuthError(data.error || AUTH_MESSAGE.RESET_LINK_FAILED)
          return
        }
        setSuccessMessage(AUTH_MESSAGE.PASSWORD_RESET_SENT)
      } catch {
        setAuthError(AUTH_MESSAGE.RESET_PASSWORD_ERROR)
      } finally {
        setSubmitting(false)
      }
    },
  })

  return { signInForm, signUpForm, forgotForm }
}
