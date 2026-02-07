
import { Plan } from '../schemas'

// ==========================================
// DEPENDENCY GRAPH VISUALIZATION
// ==========================================
// Generates visual representations of plan task dependencies.
// Supports Mermaid, ASCII, and JSON formats.

export type GraphFormat = 'mermaid' | 'ascii' | 'json'

export interface GraphNode {
    id: string
    title: string
    status: string
    dependencies: string[]
    depth: number
}

export class DependencyGraph {
    private nodes: Map<string, GraphNode> = new Map()

    /**
     * Build graph from a plan.
     */
    static fromPlan(plan: Plan): DependencyGraph {
        const graph = new DependencyGraph()

        for (const item of plan.items) {
            graph.addNode({
                id: item.id,
                title: item.title,
                status: item.status,
                dependencies: item.dependencies || [],
                depth: 0 // Will be calculated
            })
        }

        graph.calculateDepths()
        return graph
    }

    addNode(node: GraphNode): void {
        this.nodes.set(node.id, node)
    }

    /**
     * Calculate depth of each node based on dependencies.
     */
    private calculateDepths(): void {
        const visited = new Set<string>()

        const getDepth = (id: string): number => {
            const node = this.nodes.get(id)
            if (!node) return 0
            if (visited.has(id)) return node.depth // Prevent cycles

            visited.add(id)

            if (node.dependencies.length === 0) {
                node.depth = 0
                return 0
            }

            const maxDepDep = Math.max(...node.dependencies.map(d => getDepth(d)))
            node.depth = maxDepDep + 1
            return node.depth
        }

        for (const id of this.nodes.keys()) {
            getDepth(id)
        }
    }

    /**
     * Generate Mermaid flowchart.
     */
    toMermaid(): string {
        const lines: string[] = ['graph LR']

        // Define nodes with status colors
        for (const node of this.nodes.values()) {
            const style = this.getStatusStyle(node.status)
            const label = node.title.replace(/"/g, '\'')
            lines.push(`    ${node.id}["${label}"]${style}`)
        }

        lines.push('')

        // Define edges
        for (const node of this.nodes.values()) {
            for (const dep of node.dependencies) {
                lines.push(`    ${dep} --> ${node.id}`)
            }
        }

        // Add style definitions
        lines.push('')
        lines.push('    classDef pending fill:#f9f9f9,stroke:#999')
        lines.push('    classDef inprogress fill:#fff3cd,stroke:#ffc107')
        lines.push('    classDef completed fill:#d4edda,stroke:#28a745')
        lines.push('    classDef failed fill:#f8d7da,stroke:#dc3545')

        return lines.join('\n')
    }

    private getStatusStyle(status: string): string {
        switch (status) {
            case 'pending': return ':::pending'
            case 'in-progress': return ':::inprogress'
            case 'completed': return ':::completed'
            case 'failed': return ':::failed'
            default: return ''
        }
    }

    /**
     * Generate ASCII art representation.
     */
    toAscii(): string {
        const lines: string[] = []
        const nodesByDepth = new Map<number, GraphNode[]>()

        // Group by depth
        for (const node of this.nodes.values()) {
            const nodes = nodesByDepth.get(node.depth) || []
            nodes.push(node)
            nodesByDepth.set(node.depth, nodes)
        }

        // Sort depths
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b)

        for (const depth of depths) {
            const nodes = nodesByDepth.get(depth) || []
            const indent = '  '.repeat(depth)

            for (const node of nodes) {
                const statusIcon = this.getStatusIcon(node.status)
                lines.push(`${indent}${statusIcon} [${node.id}] ${node.title}`)

                if (node.dependencies.length > 0) {
                    lines.push(`${indent}   └── depends on: ${node.dependencies.join(', ')}`)
                }
            }
        }

        return lines.join('\n')
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'pending': return '○'
            case 'in-progress': return '◐'
            case 'completed': return '●'
            case 'failed': return '✗'
            case 'skipped': return '⊘'
            default: return '?'
        }
    }

    /**
     * Export as JSON for custom visualization.
     */
    toJSON(): { nodes: GraphNode[]; edges: { from: string; to: string }[] } {
        const nodes = Array.from(this.nodes.values())
        const edges: { from: string; to: string }[] = []

        for (const node of nodes) {
            for (const dep of node.dependencies) {
                edges.push({ from: dep, to: node.id })
            }
        }

        return { nodes, edges }
    }

    /**
     * Get nodes by status.
     */
    getByStatus(status: string): GraphNode[] {
        return Array.from(this.nodes.values()).filter(n => n.status === status)
    }

    /**
     * Get critical path (longest chain of dependencies).
     */
    getCriticalPath(): string[] {
        let longestPath: string[] = []

        const findPath = (nodeId: string, path: string[]): void => {
            const node = this.nodes.get(nodeId)
            if (!node) return

            const currentPath = [...path, nodeId]

            // Find nodes that depend on this one
            const dependents = Array.from(this.nodes.values())
                .filter(n => n.dependencies.includes(nodeId))

            if (dependents.length === 0) {
                if (currentPath.length > longestPath.length) {
                    longestPath = currentPath
                }
            } else {
                for (const dep of dependents) {
                    findPath(dep.id, currentPath)
                }
            }
        }

        // Start from root nodes (no dependencies)
        const roots = Array.from(this.nodes.values())
            .filter(n => n.dependencies.length === 0)

        for (const root of roots) {
            findPath(root.id, [])
        }

        return longestPath
    }
}
