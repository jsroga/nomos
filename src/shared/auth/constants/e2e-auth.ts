import { SupabaseAuthRole, SupabaseTokenType } from '@/shared/data/constants/protocol'

export const E2E_MOCK_USER_ID = '00000000-0000-4000-8000-000000000001'
export const E2E_MOCK_USER_EMAIL = 'e2e-test@example.com'
export const E2E_MOCK_ACCESS_TOKEN = 'e2e-mock-token'
export const E2E_MOCK_REFRESH_TOKEN = 'e2e-mock-refresh'

export const E2E_AUTH_ROLE = SupabaseAuthRole.Authenticated
export const E2E_TOKEN_TYPE = SupabaseTokenType.Bearer
