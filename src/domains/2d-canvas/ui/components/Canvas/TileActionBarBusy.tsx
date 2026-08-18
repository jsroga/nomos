import { HtmlElementType } from '@/shared/data/constants/protocol'
import {
  TileActionBarClass,
  TileActionBarCopy,
  formatTileCoords,
} from '@/domains/2d-canvas/ui/constants/tile-action-bar'

interface TileActionBarBusyProps {
  x: number
  y: number
  status: TileActionBarCopy
  onCancel: () => void
}

export function TileActionBarBusy({ x, y, status, onCancel }: TileActionBarBusyProps) {
  return (
    <>
      <span className={TileActionBarClass.Spinner} />
      <span className={TileActionBarClass.Status}>{status}</span>
      <span className={TileActionBarClass.Coords}>{formatTileCoords(x, y)}</span>
      <span className="flex-1" />
      <button type={HtmlElementType.Button} className={TileActionBarClass.Cancel} onClick={onCancel}>
        {TileActionBarCopy.Cancel}
      </button>
    </>
  )
}
