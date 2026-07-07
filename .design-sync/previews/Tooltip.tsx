import {
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'world-building-kit'
import { Wand2 } from 'lucide-react'

export const IconWithTooltip = () => (
  <TooltipProvider>
    <div className="flex h-32 items-end justify-center pb-2">
      <Tooltip open>
        <TooltipTrigger asChild>
          <span>
            <IconButton icon={<Wand2 className="h-4 w-4" />} onClick={() => {}} />
          </span>
        </TooltipTrigger>
        <TooltipContent>Generate beats for this scene</TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
)
