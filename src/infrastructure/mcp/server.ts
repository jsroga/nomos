import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { storytellerTools } from './storyteller-tools'
import { loopCreatorTools } from './loop-tools'
import { worldTools } from './world-tools'
import { marketingTools } from './marketing-tools'
import { deductionTools } from './deduction-tools'
import { entityBridgeTools } from './entity-bridge-tools'
import { z } from 'zod'

interface McpTool {
  description: string
  schema: z.ZodObject<any>
  handler: (args: any) => Promise<any>
}

/**
 * MCP Server Implementation for World Building Toolkit
 */
export class WorldBuilderMcpServer {
  private server: Server
  private tools: Record<string, any>

  constructor() {
    this.server = new Server(
      {
        name: 'world-builder-kit',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    // Combine all domain tools
    this.tools = {
      ...storytellerTools,
      ...loopCreatorTools,
      ...worldTools,
      ...marketingTools,
      ...deductionTools,
      ...entityBridgeTools,

      // Cross-domain Summary Tools
      get_project_health: {
        description:
          'Retrieve a high-level summary of project progress across all domains (Story, World, Loops, Marketing).',
        schema: z.object({
          projectId: z.string().uuid().describe('The UUID of the project'),
        }),
        handler: async ({ projectId }: { projectId: string }) => {
          // This tool orchestrates multiple other tools to provide a summary
          const bible = await storytellerTools.get_bible.handler({ projectId })
          const loops = await loopCreatorTools.get_loops.handler({ projectId })
          const entities = await entityBridgeTools.search_entities.handler({ projectId, query: '' })

          return {
            projectName: (bible as any)?.name || 'Unknown Project',
            completeness: {
              bible: !!bible,
              loops: loops.length,
              entities: entities.length,
            },
            status: 'Active',
          }
        },
      },
    }

    this.setupHandlers()
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(this.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.schema.shape
          ? {
              type: 'object',
              properties: Object.fromEntries(
                Object.entries(tool.schema.shape).map(([k, v]) => [
                  k,
                  { type: 'string', description: (v as any).description }, // Simplified for MCP
                ])
              ),
              required: Object.keys(tool.schema.shape),
            }
          : { type: 'object', properties: {} },
      })),
    }))

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params
      const tool = this.tools[name]

      if (!tool) {
        throw new Error(`Tool not found: ${name}`)
      }

      try {
        // Validation
        const validatedArgs = tool.schema.parse(args)

        // Execution
        const result = await tool.handler(validatedArgs)

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error.message || 'Unknown error occurred during tool execution',
            },
          ],
        }
      }
    })
  }

  /**
   * Get the underlying server instance
   */
  public getServer() {
    return this.server
  }
}

// Singleton instance
export const mcpServer = new WorldBuilderMcpServer()
