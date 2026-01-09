
import { UnityExporter } from '../utils/UnityExporter'

// Mock Fetch
const mockFetch = async (url: string) => {
    return {
        ok: true,
        blob: async () => new Blob(['fake-binary-content'], { type: 'application/octet-stream' })
    }
}
global.fetch = mockFetch as any

// Simple test runner helpers
function describe(name: string, fn: () => Promise<void> | void) {
    console.log(`\n=== ${name} ===`)
    fn()
}

async function it(name: string, fn: () => Promise<void> | void) {
    console.log(`Test: ${name}`)
    try {
        await fn()
        console.log('  PASS')
    } catch (e: any) {
        console.error(`  FAIL: ${e.message}`)
        throw e
    }
}

function expect(actual: any) {
    return {
        toBe: (expected: any) => {
            if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`)
        },
        toEqual: (expected: any) => {
            const actualStr = JSON.stringify(actual)
            const expectedStr = JSON.stringify(expected)
            if (actualStr !== expectedStr) throw new Error(`Expected ${expectedStr}, got ${actualStr}`)
        },
        toHaveLength: (length: number) => {
            if (actual.length !== length) throw new Error(`Expected length ${length}, got ${actual.length}`)
        },
        toBeDefined: () => {
            if (actual === undefined || actual === null) throw new Error('Expected value to be defined')
        },
        toBeGreaterThan: (val: number) => {
            if (actual <= val) throw new Error(`Expected > ${val}, got ${actual}`)
        },
        toContain: (val: string) => {
            if (!actual.includes(val)) throw new Error(`Expected to contain ${val}, got ${actual}`)
        }
    }
}

async function runTests() {
    const mockState = {
        walls: [
            {
                id: 'wall-1',
                start: [0, 0, 0] as [number, number, number],
                end: [10, 0, 0] as [number, number, number],
                height: 3,
                thickness: 0.5,
                texture: 'http://example.com/brick.png'
            }
        ],
        objects: [
            {
                id: 'obj-1',
                modelUrl: 'http://example.com/chair.glb',
                position: [5, 0, 5] as [number, number, number],
                rotation: [0, 1.57, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number]
            },
            {
                id: 'obj-2',
                modelUrl: 'cube', // Primitive, should handle gracefully
                position: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number]
            }
        ]
    }

    try {
        describe('UnityExporter', async () => {
            // We now test the zip generation mainly as logic is embedded there
            await it('prepares export with asset bundling', async () => {
                const zip = await UnityExporter.prepareExport(mockState)

                // Check Folder Structure
                const files = Object.keys(zip.files)
                console.log('Zip Files:', files)

                expect(files).toContain('Assets/InteriorDesign/Scenes/design.json')
                expect(files).toContain('Assets/InteriorDesign/Editor/TilemapImporter.cs')

                // Verify Assets were "downloaded"
                // filenames are normalized: prefix_id.ext
                expect(files).toContain('Assets/InteriorDesign/Models/model_obj-1.glb')
                expect(files).toContain('Assets/InteriorDesign/Textures/tex_wall-1.png')

                // Verify content of design.json (manifest)
                const jsonContent = await zip.file('Assets/InteriorDesign/Scenes/design.json')?.async('string')
                const manifest = JSON.parse(jsonContent || '{}')

                expect(manifest.version).toBe('2.0.0')
                expect(manifest.walls).toHaveLength(1)
                expect(manifest.objects).toHaveLength(2)

                // Check Local Paths in Manifest
                expect(manifest.objects[0].localModelPath).toBe('Assets/InteriorDesign/Models/model_obj-1.glb')
                expect(manifest.objects[1].localModelPath).toBe(undefined) // Cube has no local path
                expect(manifest.walls[0].localTexturePath).toBe('Assets/InteriorDesign/Textures/tex_wall-1.png')
            })

            await it('creates a final zip blob', async () => {
                const blob = await UnityExporter.createExportZip(mockState)
                expect(blob).toBeDefined()
                expect(blob.size).toBeGreaterThan(0)
            })
        })
        console.log('\n✅ All tests passed!')
    } catch (e) {
        console.error('\n❌ Tests failed', e)
        process.exit(1)
    }
}

runTests()
