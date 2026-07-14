export enum AuthValidationField {
  Password = 'password',
}

export enum AuthValidationMessage {
  EmailInvalid = 'Please enter a valid email address',
  EmailRequired = 'Email is required',
  PasswordMinLength = 'Password must be at least 8 characters',
  PasswordUppercase = 'Password must contain at least one uppercase letter',
  PasswordNumber = 'Password must contain at least one number',
  PasswordRequired = 'Password is required',
  PasswordsMustMatch = 'Passwords must match',
  ConfirmPasswordRequired = 'Please confirm your password',
}
