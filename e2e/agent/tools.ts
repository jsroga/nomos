
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import * as fs from 'fs/promises'
import * as path from 'path'

// directory where tests are stored
const TESTS_DIR = path.join(process.cwd(), 'e2e', 'scenarios')

export class ListTestsTool extends StructuredTool {
    name = 'list_tests'
    description = 'List all existing E2E test files to understand current coverage.'
    schema = z.object({})

    async _call(_input: any): Promise<string> {
        try {
            await fs.mkdir(TESTS_DIR, { recursive: true })
            const files = await fs.readdir(TESTS_DIR)
            return JSON.stringify(files, null, 2)
        } catch (error: any) {
            return `Error listing tests: ${error.message}`
        }
    }
}

export class ReadTestTool extends StructuredTool {
    name = 'read_test'
    description = 'Read the content of a specific E2E test file.'
    schema = z.object({
        filename: z.string().describe('Name of the file to read (e.g. \'auth.spec.ts\')')
    })

    async _call(input: { filename: string }): Promise<string> {
        try {
            const content = await fs.readFile(path.join(TESTS_DIR, input.filename), 'utf-8')
            return content
        } catch (error: any) {
            return `Error reading test ${input.filename}: ${error.message}`
        }
    }
}

export class SaveTestTool extends StructuredTool {
    name = 'save_test'
    description = 'Save a new or updated E2E test file.'
    schema = z.object({
        filename: z.string().describe('Name of the file (must end in .spec.ts)'),
        content: z.string().describe('Full Playwright test code')
    })

    async _call(input: { filename: string, content: string }): Promise<string> {
        if (!input.filename.endsWith('.spec.ts')) {
            return 'Error: Filename must end with .spec.ts'
        }
        try {
            await fs.writeFile(path.join(TESTS_DIR, input.filename), input.content)
            return `Successfully saved ${input.filename}`
        } catch (error: any) {
            return `Error saving test: ${error.message}`
        }
    }
}
