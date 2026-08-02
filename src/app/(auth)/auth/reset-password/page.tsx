'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormik } from 'formik'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { resetPasswordSchema } from '@/shared/auth/validation'
import { AUTH_MESSAGE } from '@/shared/auth/constants/auth-messages'
import { RESET_PASSWORD_STYLES } from '@/app/(auth)/constants/auth-styles'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const form = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null)
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: values.password,
        })

        if (updateError) {
          setError(updateError.message)
          return
        }

        setSuccess(true)
        setTimeout(() => router.push('/projects'), 2000)
      } catch {
        setError(AUTH_MESSAGE.RESET_PASSWORD_ERROR)
      } finally {
        setSubmitting(false)
      }
    },
  })

  const inputClassName = RESET_PASSWORD_STYLES.INPUT
  const errorClassName = RESET_PASSWORD_STYLES.ERROR

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-black">
      <div className="w-full max-w-md">
        <div className="p-8 flex flex-col justify-center bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center space-y-2 text-center mb-8">
            <img src="/logo.png" alt="nomos.gg" className="w-40 h-auto drop-shadow-lg mb-2" />
            <h1 className="text-lg font-semibold text-white">Set New Password</h1>
            <p className="text-sm text-white/50">Enter your new password below.</p>
          </div>

          {success ? (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center">
              Password updated successfully. Redirecting...
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={form.handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">
                    New Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    className={inputClassName}
                    {...form.getFieldProps('password')}
                  />
                  {form.touched.password && form.errors.password && (
                    <p className={errorClassName}>{form.errors.password}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/80">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className={inputClassName}
                    {...form.getFieldProps('confirmPassword')}
                  />
                  {form.touched.confirmPassword && form.errors.confirmPassword && (
                    <p className={errorClassName}>{form.errors.confirmPassword}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  size="lg"
                  disabled={form.isSubmitting}
                >
                  {form.isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
