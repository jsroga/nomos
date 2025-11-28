import React, { useState } from 'react';
import { useWorldStore } from '@/store/useWorldStore';
import { Loader2, Wand2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aiService } from '@/lib/ai/service';
import { SettingsDialog } from './SettingsDialog';

export const Sidebar: React.FC = () => {
    const { selectedTile, addTile, isGenerating, setGenerating, tiles } = useWorldStore();
    const [prompt, setPrompt] = useState("Isometric painted world in the style of Disco Elysium, detailed urban environment, painterly art style");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!selectedTile) return;

        setGenerating(true);
        setError(null);

        // 1. Gather Context
        const neighbors = {
            right: tiles[`${selectedTile.x + 1},${selectedTile.y}`],
            left: tiles[`${selectedTile.x - 1},${selectedTile.y}`],
            down: tiles[`${selectedTile.x},${selectedTile.y + 1}`],
            up: tiles[`${selectedTile.x},${selectedTile.y - 1}`],
        };

        try {
            const imageUrl = await aiService.generate(prompt, {
                targetX: selectedTile.x,
                targetY: selectedTile.y,
                neighbors,
                allTiles: tiles
            });

            addTile({
                x: selectedTile.x,
                y: selectedTile.y,
                imageUrl,
                prompt,
            });
        } catch (error: any) {
            console.error("Generation failed", error);
            setError(error.message || "Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <div className="w-80 h-full bg-card border-l border-border p-4 flex flex-col gap-4 shadow-xl z-20">
                <div className="flex items-center justify-between mb-4">
                    <div className="font-bold text-xl">World Gen</div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Global Prompt</label>
                    <textarea
                        className="w-full h-32 p-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your world..."
                    />
                </div>

                <div className="flex-1">
                    <div className="text-sm font-medium mb-2">Selection</div>
                    {selectedTile ? (
                        <div className="p-3 bg-muted rounded-md text-sm">
                            <div>X: {selectedTile.x}</div>
                            <div>Y: {selectedTile.y}</div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                {tiles[`${selectedTile.x},${selectedTile.y}`] ? "Existing Tile" : "Empty Spot"}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground italic">
                            Select a tile on the grid to generate.
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-xs rounded-md border border-destructive/20">
                            Error: {error}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!selectedTile || isGenerating}
                    className={cn(
                        "w-full py-3 px-4 rounded-md font-medium flex items-center justify-center gap-2 transition-colors",
                        !selectedTile || isGenerating
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-4 h-4" />
                            Generate Tile
                        </>
                    )}
                </button>
            </div>

            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};
