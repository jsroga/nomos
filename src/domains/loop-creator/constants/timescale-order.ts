/** Canvas group timescale sort order (moment → day). */

export enum LoopTimescaleOrder {
  Moment = 'moment',
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Custom = 'custom',
}

export const LOOP_TIMESCALE_ORDER: LoopTimescaleOrder[] = [
  LoopTimescaleOrder.Moment,
  LoopTimescaleOrder.Minute,
  LoopTimescaleOrder.Hour,
  LoopTimescaleOrder.Day,
]

export function loopTimescaleSortIndex(timescale: string): number {
  for (let index = 0; index < LOOP_TIMESCALE_ORDER.length; index += 1) {
    if (LOOP_TIMESCALE_ORDER[index] === timescale) return index
  }
  return -1
}
