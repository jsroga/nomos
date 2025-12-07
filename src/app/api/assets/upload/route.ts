
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assets } from '@/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File
        const projectId = formData.get('projectId') as string

        // We might want user_id. For now hardcode or extract from session if available.
        // The schema requires user_id. 
        // I'll try to get it from a header or assume a default dev user if Auth is not strict yet,
        // or pass it from client.
        // Let's check how other routes handle it.
        // For now I'll require it from client or use a placeholder.
        const userId = formData.get('userId') as string || '00000000-0000-0000-0000-000000000000'

        if (!file || !projectId) {
            return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const filename = file.name.replace(/\s+/g, '_') // Sanitize
        const isModel = filename.endsWith('.glb') || filename.endsWith('.gltf')
        const isImage = filename.match(/\.(jpg|jpeg|png|webp)$/i)

        if (!isModel && !isImage) {
            return NextResponse.json({ error: 'Invalid file type. Only GLB, GLTF, PNG, JPG, WEBP allowed.' }, { status: 400 })
        }

        // Save to public folder
        // struct: public/projects/[id]/assets/[filename]
        const uploadDir = path.join(process.cwd(), 'public', 'projects', projectId, 'assets')
        await mkdir(uploadDir, { recursive: true })

        const filePath = path.join(uploadDir, filename)
        await writeFile(filePath, buffer)

        // DB Insert
        // Asset: { id, project_id, user_id, image_filename, model_filename, ... }
        const newAsset = {
            id: uuidv4(),
            projectId,
            userId,
            // If it's a model, we need a thumbnail. 
            // For now, if model, we might require a separate thumbnail or use a default?
            // OR reuse the model filename if the system can generate one?
            // The schema has `image_filename` as NOT NULL.
            // If user uploads a GLB, we don't have an image unless they upload one too.
            // Plan: If model, set image_filename to a placeholder or same string if system handles it?
            // Current AssetLibrary constructs thumbnail URL: `/projects/.../assets/image_filename`
            // If I put 'placeholder.png' it might work.
            // Let's assume for this iteration:
            // 1. If Image -> image_filename = filename, model_filename = null
            // 2. If Model -> model_filename = filename, image_filename = 'placeholder.png' (or we need to generate one)
            imageFilename: isImage ? filename : 'placeholder.png',
            modelFilename: isModel ? filename : null,
            metadata: {
                originalName: file.name,
                size: file.size,
                type: isModel ? 'model' : 'image'
            }
        }

        await db.insert(assets).values({
            id: newAsset.id,
            projectId: newAsset.projectId,
            userId: newAsset.userId,
            imageFilename: newAsset.imageFilename,
            modelFilename: newAsset.modelFilename,
            metadata: newAsset.metadata,
        })

        return NextResponse.json(newAsset)
    } catch (error) {
        console.error('Upload failed:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
