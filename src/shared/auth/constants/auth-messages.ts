/** Auth route query parameter names and flow types. */

export const AUTH_QUERY_PARAM = {
  CODE: 'code',
  TYPE: 'type',
} as const

export const AUTH_FLOW_TYPE = {
  RECOVERY: 'recovery',
} as const

export const AUTH_MESSAGE = {
  VALIDATION_FAILED: 'Validation failed',
  CHECK_EMAIL: 'Check your email to confirm your account',
  CHECK_EMAIL_WITH_PERIOD: 'Check your email to confirm your account.',
  PASSWORD_RESET_SENT:
    'If an account exists with that email, a password reset link has been sent',
  RESET_PASSWORD_ERROR: 'Something went wrong. Please try again.',
  SIGN_IN_FAILED: 'Sign in failed',
  SIGN_UP_FAILED: 'Sign up failed',
  RESET_LINK_FAILED: 'Failed to send reset link',
} as const

export enum AuthPageView {
  Auth = 'auth',
  ForgotPassword = 'forgot-password',
}

export enum AuthTab {
  SignIn = 'signin',
  SignUp = 'signup',
}

export enum LoginFormCopy {
  SignInTitle = 'Sign in',
  SignInSubtitle = 'Welcome back — continue building your worlds.',
  SignUpTitle = 'Create account',
  SignUpSubtitle = 'Set up your workspace and start building.',
  ResetTitle = 'Reset Password',
  ResetSubtitle = 'Enter your email and we\'ll send you a reset link.',
  AlreadyHaveAccount = 'Already have an account? Sign in',
  DividerEmail = 'Or continue with email',
  Forgot = 'Forgot?',
  SignInSubmit = 'Sign In',
  SignInSubmitting = 'Signing in...',
  SignUpSubmit = 'Create Account',
  SignUpSubmitting = 'Creating account...',
  ResetSubmit = 'Send Reset Link',
  ResetSubmitting = 'Sending...',
  BackToSignIn = 'Back to sign in',
}

export const AUTH_PAGE_ELEMENT_ID = {
  TURBULENT_BG_CANVAS: 'turbulent-bg-canvas',
} as const

export const AUTH_ROUTE = {
  RESET_PASSWORD: '/auth/reset-password',
  PROJECTS: '/projects',
  CALLBACK: 'auth/callback',
} as const
