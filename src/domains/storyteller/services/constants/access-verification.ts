export const E2E_TEST_USER_ID = 'e2e-test-user-id'

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
}

export const E2E_BYPASS_NODE_ENVS = new Set<string>([NodeEnv.Development, NodeEnv.Test])
