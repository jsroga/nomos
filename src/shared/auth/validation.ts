import * as yup from 'yup'
import {
  AuthValidationField,
  AuthValidationMessage,
} from '@/shared/auth/constants/auth-validation-messages'

const email = yup
  .string()
  .email(AuthValidationMessage.EmailInvalid)
  .required(AuthValidationMessage.EmailRequired)

const password = yup
  .string()
  .min(8, AuthValidationMessage.PasswordMinLength)
  .matches(/[A-Z]/, AuthValidationMessage.PasswordUppercase)
  .matches(/[0-9]/, AuthValidationMessage.PasswordNumber)
  .required(AuthValidationMessage.PasswordRequired)

const passwordSignIn = yup
  .string()
  .min(8, AuthValidationMessage.PasswordMinLength)
  .required(AuthValidationMessage.PasswordRequired)

const confirmPassword = yup
  .string()
  .oneOf([yup.ref(AuthValidationField.Password)], AuthValidationMessage.PasswordsMustMatch)
  .required(AuthValidationMessage.ConfirmPasswordRequired)

export const signInSchema = yup.object({ email, password: passwordSignIn })

export const signUpSchema = yup.object({ email, password, confirmPassword })

export const forgotPasswordSchema = yup.object({ email })

export const resetPasswordSchema = yup.object({ password, confirmPassword })
