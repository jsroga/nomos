
import { Project } from 'ts-morph'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export class AstAnalysisTool extends StructuredTool {
    name = 'ast_analysis'
    description = 'Analyze a TypeScript file using AST to extract structure (classes, methods, exports).'
    schema = z.object({
        filePath: z.string().describe('Absolute or relative path to the file')
    })

    async _call(input: { filePath: string }): Promise<string> {
        try {
            // Initialize project (lightweight)
            const project = new Project({
                skipAddingFilesFromTsConfig: true
            })
            const sourceFile = project.addSourceFileAtPath(input.filePath)

            const structure = {
                classes: sourceFile.getClasses().map(c => ({
                    name: c.getName(),
                    methods: c.getMethods().map(m => m.getName()),
                    isExported: c.isExported()
                })),
                functions: sourceFile.getFunctions().map(f => ({
                    name: f.getName(),
                    isExported: f.isExported()
                })),
                interfaces: sourceFile.getInterfaces().map(i => i.getName())
            }

            return JSON.stringify(structure, null, 2)
        } catch (e: any) {
            return JSON.stringify({ error: e.message })
        }
    }
}
