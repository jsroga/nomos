
import { ExecutiveAgent, ExecutiveConfig, CoPilotInteraction } from '../executive'
import { PlannerTool, PlanPersistence } from '../planner'
import { StructuredTool } from '@langchain/core/tools'
import { AstAnalysisTool } from '../../../tools/ast-tools'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ==========================================
// AUTO-REFACTOR MODE
// ==========================================
// An autonomous agent that plans and executes codebase cleanup.
// Uses ESLint, Prettier, and TSC to identify improvement opportunities.

// Tool: Run ESLint analysis
export class AnalyzeLintTool extends StructuredTool {
    name = 'analyze_lint'
    description = 'Run ESLint on a directory and return a summary of issues.'
    schema = z.object({
        directory: z.string().describe('Relative path to analyze (e.g., "src/agent-core")')
    })

    async _call(input: { directory: string }): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(
                `npx eslint "${input.directory}/**/*.ts" --format json`,
                { cwd: process.cwd(), maxBuffer: 1024 * 1024 }
            )
            const results = JSON.parse(stdout || '[]')
            const summary = {
                filesAnalyzed: results.length,
                errors: results.reduce((sum: number, r: { errorCount: number }) => sum + r.errorCount, 0),
                warnings: results.reduce((sum: number, r: { warningCount: number }) => sum + r.warningCount, 0),
                topIssues: results
                    .flatMap((r: { messages: Array<{ ruleId: string }> }) => r.messages)
                    .reduce((acc: Record<string, number>, m: { ruleId: string }) => {
                        acc[m.ruleId] = (acc[m.ruleId] || 0) + 1
                        return acc
                    }, {})
            }
            return JSON.stringify(summary, null, 2)
        } catch (e: unknown) {
            // ESLint returns exit code 1 when it finds issues
            const error = e as { stdout?: string; stderr?: string; message?: string }
            if (error.stdout) {
                const results = JSON.parse(error.stdout || '[]')
                return JSON.stringify({
                    filesAnalyzed: results.length,
                    errors: results.reduce((sum: number, r: { errorCount: number }) => sum + r.errorCount, 0),
                    warnings: results.reduce((sum: number, r: { warningCount: number }) => sum + r.warningCount, 0)
                })
            }
            return JSON.stringify({ error: error.message })
        }
    }
}

// Tool: Run TSC type check
export class TypeCheckTool extends StructuredTool {
    name = 'type_check'
    description = 'Run TypeScript type checking and return a summary of errors.'
    schema = z.object({
        directory: z.string().describe('Relative path to check')
    })

    async _call(input: { directory: string }): Promise<string> {
        try {
            const { stdout, stderr } = await execAsync(
                `npx tsc --noEmit 2>&1 | grep -E "^${input.directory}" | head -20`,
                { cwd: process.cwd() }
            )
            const lines = (stdout + stderr).trim().split('\n').filter(Boolean)
            return JSON.stringify({
                errorCount: lines.length,
                samples: lines.slice(0, 5)
            })
        } catch (e: unknown) {
            const error = e as { stdout?: string; message?: string }
            return JSON.stringify({ errorCount: 0, message: error.stdout || 'No errors found' })
        }
    }
}

// Tool: Apply ESLint auto-fix
export class AutoFixLintTool extends StructuredTool {
    name = 'auto_fix_lint'
    description = 'Apply ESLint auto-fixes to a directory.'
    schema = z.object({
        directory: z.string().describe('Relative path to fix')
    })

    async _call(input: { directory: string }): Promise<string> {
        try {
            await execAsync(
                `npx eslint "${input.directory}/**/*.ts" --fix`,
                { cwd: process.cwd() }
            )
            return `Successfully applied auto-fixes to ${input.directory}`
        } catch (e: unknown) {
            // ESLint --fix still returns 1 if unfixable issues remain
            return `Auto-fix completed with some remaining issues in ${input.directory}`
        }
    }
}

export interface AutoRefactorConfig {
    persistence: PlanPersistence
    targetDirectory: string
    modelName?: string
}

export class AutoRefactorAgent {
    private agent: ExecutiveAgent
    private targetDirectory: string

    constructor(config: AutoRefactorConfig) {
        const planner = new PlannerTool(config.persistence)

        const tools = [
            new AnalyzeLintTool(),
            new TypeCheckTool(),
            new AutoFixLintTool(),
            new AstAnalysisTool()
        ]

        const executiveConfig: ExecutiveConfig = {
            modelName: config.modelName || 'claude-3-haiku-20240307',
            planner: planner,
            tools: tools
        }

        this.agent = new ExecutiveAgent(executiveConfig)
        this.targetDirectory = config.targetDirectory
    }

    async analyze(): Promise<CoPilotInteraction> {
        const context = `Target: ${this.targetDirectory}. Analyze lint issues and type errors.`
        return this.agent.runLoop('Analyze codebase for refactoring opportunities', context)
    }

    async refactor(): Promise<CoPilotInteraction> {
        const context = `Target: ${this.targetDirectory}. Apply auto-fixes and report remaining issues.`
        return this.agent.runLoop('Apply auto-refactoring to codebase', context)
    }
}
