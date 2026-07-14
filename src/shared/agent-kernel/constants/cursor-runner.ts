export const CURSOR_RUNNER_DEFAULT_MODEL = 'composer-2.5'
export const CURSOR_RUNNER_DEFAULT_ENVIRONMENT = 'execute-docker'

export enum CursorRunnerExecField {
  Stderr = 'stderr',
}

export enum CursorRunnerEncoding {
  Utf8 = 'utf8',
}

export enum CursorRunnerStdio {
  Pipe = 'pipe',
}

export enum CursorRunnerJsonSchemaType {
  Object = 'object',
  String = 'string',
  Boolean = 'boolean',
  Text = 'text',
}

export enum CursorRunnerToolDescription {
  FabroRun =
    'Launch a Fabro execute workflow run for a module in the sandbox. Returns the run id and tail of the run output. Use for isolated dark-factory builds.',
  FabroVerify =
    'Run the module-scoped typecheck + lint gate (node scripts/fabro-verify.mjs). Reads the module from PLAN.md. Use before declaring work done; mirrors the Fabro verify stage.',
  NpmScript =
    'Run an npm script from package.json (e.g. "test:unit", "test:e2e", "eval", "typecheck", "lint"). Returns stdout/stderr.',
  ReadArtifact =
    'Read a run artifact file (PLAN.md, DECISIONS.md, STRUCTURE.md, UX.md, SCREENSHOTS.md, RETRO.md, .local/findings/scope.md). Returns the file contents or "missing".',
}

export enum CursorRunnerSchemaDescription {
  FabroEnvironmentId = 'Fabro environment id',
  AutoApprove = 'Pass --auto-approve (unattended build). Default false.',
  NpmScriptArgs = 'Extra args after --',
  ArtifactPath = 'Repo-relative path to the artifact.',
}

export enum CursorRunnerSchemaProperty {
  Module = 'module',
  Environment = 'environment',
  AutoApprove = 'autoApprove',
  Script = 'script',
  Args = 'args',
  Path = 'path',
}

export enum CursorRunnerFabroFlag {
  AutoApprove = ' --auto-approve',
}

export enum CursorRunnerToolMessage {
  FabroRunModuleRequired = 'fabro_run: module is required',
  FabroRunFailed = 'FABRO RUN FAILED:\n',
  FabroVerifyPassed = 'fabro-verify passed\n',
  FabroVerifyFailed = 'fabro-verify FAILED\n',
  NpmScriptRequired = 'npm_script: script is required',
  NpmScriptFailedSuffix = ' FAILED\n',
  MissingArtifactPrefix = 'missing: ',
}

export enum CursorRunnerPromptCopy {
  OperatorNotesPrefix = '\nOperator notes: ',
  AutoApproveGate =
    '\nOperator has authorized unattended builds (--auto-approve). At the Verification gate, proceed with [A] Approve & build automatically.',
}

export enum CursorRunnerErrorMessage {
  ApiKeyRequired = 'CURSOR_API_KEY is required (user key or team service-account key).',
  CloudRepoRequired = 'cloud runtime requires --repo owner/repo',
}

export enum CursorRunnerRuntime {
  Cloud = 'cloud',
  Local = 'local',
}

export enum CursorRunnerCliFlag {
  Module = 'module',
  Cwd = 'cwd',
  Repo = 'repo',
  AutoCreatePr = 'auto-create-pr',
  Model = 'model',
  Notes = 'notes',
  AutoApprove = 'auto-approve',
  Environment = 'environment',
}

export enum CursorRunnerRunStatus {
  Finished = 'finished',
}

export enum CursorRunnerStartupLog {
  StartupFailedPrefix = 'startup failed: ',
  RetryableSuffix = ', retryable=',
}

export enum CursorRunnerFabroCommand {
  Verify = 'node scripts/fabro-verify.mjs',
}

export enum CursorRunnerEnvVar {
  CursorApiKey = 'CURSOR_API_KEY',
  CursorModel = 'CURSOR_MODEL',
}

export enum CursorRunnerContentType {
  Text = 'text',
}
