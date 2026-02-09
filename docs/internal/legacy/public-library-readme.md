# Kurtvitza 3D Asset Library

Curated collection of showcase 3D models.

## Structure

```
library/
├── manifest.json      # Asset catalog with metadata
├── models/            # 3D model files (.glb, .gltf, .fbx)
└── thumbnails/        # Preview images (256x256 PNG)
```

## Adding Models

### Via CLI Script

```bash
npx ts-node scripts/add-to-library.ts path/to/model.glb \
  --name "Dark Forest Ruins" \
  --category terrain \
  --tags "fantasy,forest,ruins" \
  --featured
```

### Via API

```bash
curl -X POST http://localhost:3001/api/library \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-model",
    "name": "My Model",
    "file": "models/my-model.glb",
    "category": "props"
  }'
```

### Manual

1. Copy model to `public/library/models/`
2. Add thumbnail to `public/library/thumbnails/`
3. Edit `manifest.json` to add entry

## Categories

- `terrain` - Landscapes, environments
- `props` - Objects, items
- `characters` - NPCs, creatures
- `buildings` - Structures, architecture
- `vehicles` - Mounts, ships
- `effects` - VFX, particles

## Fetching Library

```typescript
const res = await fetch('/api/library')
const { assets, categories } = await res.json()
```
