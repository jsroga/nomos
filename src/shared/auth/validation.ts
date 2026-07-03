import * as yup from 'yup'

const email = yup.string().email('Please enter a valid email address').required('Email is required')

const password = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .required('Password is required')

const passwordSignIn = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .required('Password is required')

const confirmPassword = yup
  .string()
  .oneOf([yup.ref('password')], 'Passwords must match')
  .required('Please confirm your password')

export const signInSchema = yup.object({ email, password: passwordSignIn })

export const signUpSchema = yup.object({ email, password, confirmPassword })

export const forgotPasswordSchema = yup.object({ email })

export const resetPasswordSchema = yup.object({ password, confirmPassword })
