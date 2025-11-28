import { create } from 'zustand'

export interface Tile {
    x: number;
    y: number;
    imageUrl?: string;
    prompt?: string;
    isGenerating?: boolean;
}

interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

interface WorldState {
    tiles: Record<string, Tile>;
    viewport: Viewport;
    selectedTile: { x: number; y: number } | null;
    isGenerating: boolean;

    // Actions
    addTile: (tile: Tile) => void;
    updateTile: (x: number, y: number, data: Partial<Tile>) => void;
    setViewport: (viewport: Partial<Viewport>) => void;
    setSelectedTile: (x: number, y: number) => void;
    setGenerating: (isGenerating: boolean) => void;
    getTile: (x: number, y: number) => Tile | undefined;
}

export const useWorldStore = create<WorldState>((set, get) => ({
    tiles: {},
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedTile: null,
    isGenerating: false,

    addTile: (tile) => set((state) => ({
        tiles: { ...state.tiles, [`${tile.x},${tile.y}`]: tile }
    })),

    updateTile: (x, y, data) => set((state) => {
        const key = `${x},${y}`;
        const existing = state.tiles[key];
        if (!existing) return state;
        return {
            tiles: { ...state.tiles, [key]: { ...existing, ...data } }
        };
    }),

    setViewport: (viewport) => set((state) => ({
        viewport: { ...state.viewport, ...viewport }
    })),

    setSelectedTile: (x, y) => set({ selectedTile: { x, y } }),

    setGenerating: (isGenerating) => set({ isGenerating }),

    getTile: (x, y) => get().tiles[`${x},${y}`],
}));
