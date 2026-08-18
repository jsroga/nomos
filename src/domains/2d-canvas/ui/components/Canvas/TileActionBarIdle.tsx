import { Sparkles, Trash2, Upload, ZoomIn } from 'lucide-react'
import { KeyboardKey, HtmlElementType } from '@/shared/data/constants/protocol'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import {
  TileActionBarClass,
  TileActionBarCopy,
  TileActionBarVariant,
  formatTileCoords,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'
import { TileActionBarEnhance } from './TileActionBarEnhance'

interface TileActionBarIdleProps {
  variant: TileActionBarVariant.Empty | TileActionBarVariant.Ready
  x: number
  y: number
  tilePrompt: string
  onTilePromptChange: (value: string) => void
  onGenerate: () => void
  onUpscale: () => void
  onUploadClick: () => void
  onClear: () => void
  allowEnhance: boolean
  enhanceOpen: boolean
  onEnhanceOpenChange: (open: boolean) => void
  creativity: number
  onCreativityChange: (value: number) => void
  onEnhanceConfirm: () => void
  isUploading: boolean
}

export function TileActionBarIdle({
  variant,
  x,
  y,
  tilePrompt,
  onTilePromptChange,
  onGenerate,
  onUpscale,
  onUploadClick,
  onClear,
  allowEnhance,
  enhanceOpen,
  onEnhanceOpenChange,
  creativity,
  onCreativityChange,
  onEnhanceConfirm,
  isUploading,
}: TileActionBarIdleProps) {
  const isEmpty = variant === TileActionBarVariant.Empty

  return (
    <>
      <span className={TileActionBarClass.Coords}>{formatTileCoords(x, y)}</span>
      <span className={TileActionBarClass.Divider} />
      <input
        id={TOUR_STEP_IDS.WORLDGEN_PROMPT}
        className={isEmpty ? TileActionBarClass.InputEmpty : TileActionBarClass.Input}
        value={tilePrompt}
        onChange={event => onTilePromptChange(event.target.value)}
        placeholder={isEmpty ? TileActionBarCopy.PlaceholderEmpty : TileActionBarCopy.PlaceholderReady}
        onKeyDown={event => {
          if (event.key === KeyboardKey.Enter) {
            event.preventDefault()
            onGenerate()
          }
        }}
      />
      <button
        type={HtmlElementType.Button}
        id={TOUR_STEP_IDS.WORLDGEN_GENERATE}
        className={TileActionBarClass.Generate}
        onClick={onGenerate}
      >
        <Sparkles size={13} strokeWidth={1.8} />
        {TileActionBarCopy.Generate}
      </button>
      {isEmpty ? (
        <button
          type={HtmlElementType.Button}
          className={TileActionBarClass.IconBtn}
          aria-label={TileActionBarCopy.Upload}
          onClick={onUploadClick}
          disabled={isUploading}
        >
          <Upload size={14} strokeWidth={1.8} />
        </button>
      ) : (
        <>
          <span className={TileActionBarClass.Divider} />
          <button
            type={HtmlElementType.Button}
            id={TOUR_STEP_IDS.WORLDGEN_UPSCALE}
            className={TileActionBarClass.Ghost}
            onClick={onUpscale}
          >
            <ZoomIn size={13} strokeWidth={1.8} />
            {TileActionBarCopy.Upscale}
          </button>
          {allowEnhance ? (
            <TileActionBarEnhance
              open={enhanceOpen}
              onOpenChange={onEnhanceOpenChange}
              creativity={creativity}
              onCreativityChange={onCreativityChange}
              onConfirm={onEnhanceConfirm}
            />
          ) : null}
          <span className={TileActionBarClass.Divider} />
          <button
            type={HtmlElementType.Button}
            className={TileActionBarClass.IconBtn}
            aria-label={TileActionBarCopy.Upload}
            onClick={onUploadClick}
            disabled={isUploading}
          >
            <Upload size={14} strokeWidth={1.8} />
          </button>
          <button
            type={HtmlElementType.Button}
            className={TileActionBarClass.Clear}
            aria-label={TileActionBarCopy.Clear}
            onClick={onClear}
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </>
      )}
    </>
  )
}
