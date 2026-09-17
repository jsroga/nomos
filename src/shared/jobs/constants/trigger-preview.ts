export enum VercelDeployEnv {
  Production = 'production',
  Preview = 'preview',
  Development = 'development',
}

/** Empty string wins over VERCEL_GIT_COMMIT_REF in the SDK (`??` chain). */
export const TRIGGER_PROD_PREVIEW_BRANCH = ''
