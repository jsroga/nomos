import { defineConfig } from 'next-openapi-gen'

export default defineConfig({
    schemaDir: 'public',
    schemaFile: 'openapi.json',
    baseUrl: 'http://localhost:3000',
    info: {
        title: 'World Building Toolkit API',
        version: '1.0.0',
        description: 'API for the World Building Toolkit - storyteller, 3D assets, interior designer, and AI modules',
    },
})
