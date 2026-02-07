/**
 * TypeScript-Python Bridge for DeepEval
 * 
 * Spawns the Python evaluation script and parses results.
 * 
 * Usage:
 *   const result = await runDeepEval({
 *     testCases: [{ input: '...', actualOutput: '...' }],
 *     metrics: ['Anti-Slop Score']
 *   })
 */

import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs/promises'
import { DeepEvalInput, DeepEvalOutput } from './types'

/** Default timeout for DeepEval evaluation (5 minutes) */
const DEFAULT_TIMEOUT_MS = 300_000

/** Path to the Python virtual environment */
const VENV_PYTHON = process.platform === 'win32'
  ? path.join('scripts', 'deepeval', 'venv', 'Scripts', 'python.exe')
  : path.join('scripts', 'deepeval', 'venv', 'bin', 'python3')

/** Path to the evaluation script */
const EVALUATE_SCRIPT = path.join('scripts', 'deepeval', 'evaluate.py')

export interface RunDeepEvalOptions {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeoutMs?: number
  /** Use virtual environment Python (default: true) */
  useVenv?: boolean
  /** Working directory (default: process.cwd()) */
  cwd?: string
}

/**
 * Run DeepEval metrics on test cases
 * 
 * @param input - Test cases and optional metric filter
 * @param options - Execution options
 * @returns Evaluation results
 */
export async function runDeepEval(
  input: DeepEvalInput,
  options: RunDeepEvalOptions = {}
): Promise<DeepEvalOutput> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    useVenv = true,
    cwd = process.cwd(),
  } = options

  // Determine Python executable
  const pythonPath = useVenv
    ? path.join(cwd, VENV_PYTHON)
    : 'python3'
  
  const scriptPath = path.join(cwd, EVALUATE_SCRIPT)

  // Check if script exists
  try {
    await fs.access(scriptPath)
  } catch {
    return {
      success: false,
      error: `Evaluation script not found: ${scriptPath}. Run: cd scripts/deepeval && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`,
      testCases: [],
    }
  }

  // Write input to temp file (handles large payloads better than stdin)
  const tempFile = path.join(cwd, '.deepeval-input.json')
  await fs.writeFile(tempFile, JSON.stringify(input, null, 2))

  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let resolved = false

    const cleanup = async () => {
      // Clean up temp file
      try {
        await fs.unlink(tempFile)
      } catch {
        // Ignore cleanup errors
      }
    }

    const resolveOnce = async (result: DeepEvalOutput) => {
      if (resolved) return
      resolved = true
      await cleanup()
      resolve(result)
    }

    // Spawn Python process
    const proc = spawn(pythonPath, [scriptPath, tempFile], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd,
    })

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('error', async (err) => {
      let errorMessage = `Failed to spawn Python: ${err.message}`
      
      if (err.message.includes('ENOENT')) {
        errorMessage = useVenv
          ? `Python virtual environment not found. Run: cd scripts/deepeval && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
          : `Python not found. Install Python 3 and try again.`
      }
      
      await resolveOnce({
        success: false,
        error: errorMessage,
        testCases: [],
      })
    })

    proc.on('close', async (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout) as DeepEvalOutput
          await resolveOnce(result)
        } catch (parseError) {
          await resolveOnce({
            success: false,
            error: `Failed to parse DeepEval output: ${stdout.slice(0, 500)}`,
            testCases: [],
          })
        }
      } else {
        // Try to parse error from stdout (DeepEval outputs errors as JSON)
        try {
          const errorResult = JSON.parse(stdout) as DeepEvalOutput
          await resolveOnce(errorResult)
        } catch {
          await resolveOnce({
            success: false,
            error: `DeepEval failed (code ${code}): ${stderr || stdout}`,
            testCases: [],
          })
        }
      }
    })

    // Timeout handler
    const timeoutHandle = setTimeout(async () => {
      proc.kill('SIGTERM')
      await resolveOnce({
        success: false,
        error: `DeepEval timed out after ${timeoutMs}ms`,
        testCases: [],
      })
    }, timeoutMs)

    // Clear timeout on process end
    proc.on('close', () => {
      clearTimeout(timeoutHandle)
    })
  })
}

/**
 * Check if DeepEval is properly set up
 * 
 * @returns True if setup is complete
 */
export async function checkDeepEvalSetup(cwd: string = process.cwd()): Promise<{
  ready: boolean
  error?: string
}> {
  const scriptPath = path.join(cwd, EVALUATE_SCRIPT)
  const venvPath = path.join(cwd, VENV_PYTHON)

  // Check script exists
  try {
    await fs.access(scriptPath)
  } catch {
    return {
      ready: false,
      error: `Evaluation script not found: ${scriptPath}`,
    }
  }

  // Check venv exists
  try {
    await fs.access(venvPath)
  } catch {
    return {
      ready: false,
      error: `Python venv not found. Run: cd scripts/deepeval && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`,
    }
  }

  // Run test command
  const result = await runDeepEval(
    {
      testCases: [{
        input: 'test',
        actualOutput: 'test output for verification',
      }],
      metrics: ['Anti-Slop Score'],
    },
    { cwd, timeoutMs: 60_000 }
  )

  if (!result.success) {
    return {
      ready: false,
      error: result.error || 'DeepEval test failed',
    }
  }

  return { ready: true }
}

/**
 * Run DeepEval with retry on failure
 */
export async function runDeepEvalWithRetry(
  input: DeepEvalInput,
  options: RunDeepEvalOptions & { maxRetries?: number } = {}
): Promise<DeepEvalOutput> {
  const { maxRetries = 2, ...runOptions } = options
  
  let lastError: DeepEvalOutput | undefined
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await runDeepEval(input, runOptions)
    
    if (result.success) {
      return result
    }
    
    lastError = result
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }
  
  return lastError || {
    success: false,
    error: 'All retries failed',
    testCases: [],
  }
}
