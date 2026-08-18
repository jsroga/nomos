import { ChevronDown, Sparkles } from 'lucide-react'
import { Slider } from '@/components/Slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import {
  FIDELITY_CREATIVITY_MAX,
  FIDELITY_CREATIVITY_MIN,
  FIDELITY_CREATIVITY_STEP,
  TileActionBarClass,
  TileActionBarCopy,
  formatCreativityValue,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'

interface TileActionBarEnhanceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creativity: number
  onCreativityChange: (value: number) => void
  onConfirm: () => void
}

export function TileActionBarEnhance({
  open,
  onOpenChange,
  creativity,
  onCreativityChange,
  onConfirm,
}: TileActionBarEnhanceProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type={HtmlElementType.Button}
          className={open ? TileActionBarClass.EnhanceOpen : TileActionBarClass.Ghost}
        >
          <Sparkles size={13} strokeWidth={1.8} />
          {TileActionBarCopy.Enhance}
          <ChevronDown size={11} strokeWidth={1.8} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(TileActionBarClass.Popover, 'p-3.5')}
        onCloseAutoFocus={event => event.preventDefault()}
      >
        <div className={TileActionBarClass.PopoverHeader}>
          <span className={TileActionBarClass.PopoverLabel}>{TileActionBarCopy.Creativity}</span>
          <span className={TileActionBarClass.PopoverValue}>{formatCreativityValue(creativity)}</span>
        </div>
        <Slider
          min={FIDELITY_CREATIVITY_MIN}
          max={FIDELITY_CREATIVITY_MAX}
          step={FIDELITY_CREATIVITY_STEP}
          value={[creativity]}
          onValueChange={values => {
            const next = values[0]
            if (next === undefined) return
            onCreativityChange(next)
          }}
        />
        <button
          type={HtmlElementType.Button}
          className={TileActionBarClass.Confirm}
          onClick={onConfirm}
        >
          <Sparkles size={13} strokeWidth={1.8} />
          {TileActionBarCopy.EnhanceFidelity}
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
