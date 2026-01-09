import React from 'react';
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function SentenceBuilder() {
    return (
        <div className="flex flex-col gap-2 pt-2">
            <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Sentence Builder</Label>
                <span className="text-[10px] text-muted-foreground">Sentence Builder</span>
            </div>

            <div className="min-h-[100px] rounded-md border border-input bg-background/50 p-3 text-sm leading-7">
                <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-muted-foreground">[</span>
                    <Badge variant="secondary" className="bg-purple-900/40 text-purple-200 border-purple-700/50 hover:bg-purple-900/60">Person: Finch</Badge>
                    <span className="text-foreground">killed</span>
                    <span className="text-muted-foreground">[</span>
                    <Badge variant="secondary" className="bg-purple-900/40 text-purple-200 border-purple-700/50 hover:bg-purple-900/60">Person: Harrington</Badge>
                    <span className="text-foreground">with</span>
                    <span className="text-muted-foreground">[</span>
                    <Badge variant="secondary" className="bg-emerald-900/40 text-emerald-200 border-emerald-700/50 hover:bg-emerald-900/60">Object: Microscope</Badge>
                    <span className="text-foreground">due to</span>
                    <span className="text-muted-foreground">[</span>
                    <Badge variant="secondary" className="bg-orange-900/40 text-orange-200 border-orange-700/50 hover:bg-orange-900/60">Motive: Embezzlement</Badge>
                    <span className="animate-pulse cursor-text">|</span>
                </div>
            </div>
        </div>
    );
}
