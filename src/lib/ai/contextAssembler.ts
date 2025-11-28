import { TileContext } from './types';

/**
 * Creates a composite image and mask for outpainting using an Edge-Strip Strategy.
 * 
 * New Strategy (Edge-Strip):
 * - Canvas: 1024x1024 (DALL-E 2 standard)
 * - Target Tile: Centered 512x512 area (256,256 to 768,768)
 * - Context: Only the edge strips from neighbors (128px wide/tall)
 * 
 * This minimizes gray background pollution while providing enough edge context
 * for seamless blending.
 * 
 * Layout:
 * - Center (256,256 -> 768,768): Target tile (masked for generation)
 * - Top edge (256,128 -> 768,256): Bottom 128px of Up neighbor
 * - Bottom edge (256,768 -> 768,896): Top 128px of Down neighbor  
 * - Left edge (128,256 -> 256,768): Right 128px of Left neighbor
 * - Right edge (768,256 -> 896,768): Left 128px of Right neighbor
 * 
 * Everything else remains transparent (no gray pollution).
 */

interface CropRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export async function assembleContextImage(context: TileContext, size: number = 1024): Promise<{ imageBlob: Blob, maskBlob: Blob, cropRect: CropRect }> {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context");

    // Start with neutral gray background
    // This prevents DALL-E from hallucinating in transparent voids
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    const TILE_SIZE = 512;
    // Maximize context: In a 1024 canvas with 512 target centered, 
    // we have (1024-512)/2 = 256px of space on each side.
    const CONTEXT_SIZE = 256;

    // Target tile is centered
    const TARGET_X = (size - TILE_SIZE) / 2; // 256
    const TARGET_Y = (size - TILE_SIZE) / 2; // 256

    // Helper to load image
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const { up, down, left, right } = context.neighbors;

    // Draw neighbors (Maximize context to 256px overlap)

    // UP neighbor: Draw bottom half
    if (up?.imageUrl) {
        try {
            const img = await loadImage(up.imageUrl);
            // Source: bottom 256px of neighbor (0, 256, 512, 256)
            // Dest: top area above target (256, 0, 512, 256)
            ctx.drawImage(
                img,
                0, TILE_SIZE - CONTEXT_SIZE, TILE_SIZE, CONTEXT_SIZE, // src
                TARGET_X, 0, TILE_SIZE, CONTEXT_SIZE // dest
            );
        } catch (e) { console.error("Failed to load up neighbor", e); }
    }

    // DOWN neighbor: Draw top half
    if (down?.imageUrl) {
        try {
            const img = await loadImage(down.imageUrl);
            // Source: top 256px of neighbor (0, 0, 512, 256)
            // Dest: bottom area below target (256, 768, 512, 256)
            ctx.drawImage(
                img,
                0, 0, TILE_SIZE, CONTEXT_SIZE, // src
                TARGET_X, TARGET_Y + TILE_SIZE, TILE_SIZE, CONTEXT_SIZE // dest
            );
        } catch (e) { console.error("Failed to load down neighbor", e); }
    }

    // LEFT neighbor: Draw right half
    if (left?.imageUrl) {
        try {
            const img = await loadImage(left.imageUrl);
            // Source: right 256px of neighbor (256, 0, 256, 512)
            // Dest: left area left of target (0, 256, 256, 512)
            ctx.drawImage(
                img,
                TILE_SIZE - CONTEXT_SIZE, 0, CONTEXT_SIZE, TILE_SIZE, // src
                0, TARGET_Y, CONTEXT_SIZE, TILE_SIZE // dest
            );
        } catch (e) { console.error("Failed to load left neighbor", e); }
    }

    // RIGHT neighbor: Draw left half
    if (right?.imageUrl) {
        try {
            const img = await loadImage(right.imageUrl);
            // Source: left 256px of neighbor (0, 0, 256, 512)
            // Dest: right area right of target (768, 256, 256, 512)
            ctx.drawImage(
                img,
                0, 0, CONTEXT_SIZE, TILE_SIZE, // src
                TARGET_X + TILE_SIZE, TARGET_Y, CONTEXT_SIZE, TILE_SIZE // dest
            );
        } catch (e) { console.error("Failed to load right neighbor", e); }
    }

    // Create mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = size;
    maskCanvas.height = size;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) throw new Error("Could not get mask context");

    // Mask: Fill entire canvas with white (keep), then clear target area (edit)
    maskCtx.fillStyle = "white";
    maskCtx.fillRect(0, 0, size, size);

    // Clear the center target area - this is where DALL-E will generate
    maskCtx.clearRect(TARGET_X, TARGET_Y, TILE_SIZE, TILE_SIZE);

    const imageBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
    const maskBlob = await new Promise<Blob>((resolve) => maskCanvas.toBlob(b => resolve(b!), 'image/png'));

    return {
        imageBlob,
        maskBlob,
        cropRect: {
            x: TARGET_X,
            y: TARGET_Y,
            width: TILE_SIZE,
            height: TILE_SIZE
        }
    };
}
