import React from 'react';
import { cn } from '@/lib/utils';
import { Tile as TileType } from '@/store/useWorldStore';
import { Loader2 } from 'lucide-react';

interface TileProps {
    tile?: TileType;
    x: number;
    y: number;
    isSelected: boolean;
    onClick: () => void;
    size: number;
}

export const Tile: React.FC<TileProps> = ({ tile, x, y, isSelected, onClick, size }) => {
    const hasImage = !!tile?.imageUrl;
    const isGenerating = tile?.isGenerating;

    return (
        <div
            onClick={onClick}
            style={{
                width: size,
                height: size,
                transform: `translate(${x * size}px, ${y * size}px)`,
            }}
            className={cn(
                "absolute top-0 left-0 border border-border/20 transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden bg-card/50 hover:bg-card/80",
                isSelected && "ring-2 ring-primary z-10",
                !hasImage && !isGenerating && "opacity-50 hover:opacity-100"
            )}
        >
            {hasImage ? (
                <img
                    src={tile.imageUrl}
                    alt={`Tile ${x},${y}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                />
            ) : isGenerating ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            ) : (
                <span className="text-xs text-muted-foreground select-none">
                    {x}, {y}
                </span>
            )}

            {/* Coordinate overlay on hover */}
            <div className="absolute bottom-1 right-1 text-[10px] text-white/50 opacity-0 hover:opacity-100 pointer-events-none">
                {x},{y}
            </div>
        </div>
    );
};
