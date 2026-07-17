/** Market size fixture data */
export const MARKET_DATA: Record<
  string,
  {
    tam: string
    sam: string
    growth: string
    platforms: Record<string, number> // percentage of market
  }
> = {
  roguelike: {
    tam: '$4.2B',
    sam: '$1.8B',
    growth: '18% YoY',
    platforms: { pc: 0.55, console: 0.3, mobile: 0.15 },
  },
  'action-roguelike': {
    tam: '$3.8B',
    sam: '$1.5B',
    growth: '22% YoY',
    platforms: { pc: 0.5, console: 0.35, mobile: 0.15 },
  },
  'survivors-like': {
    tam: '$800M',
    sam: '$400M',
    growth: '85% YoY',
    platforms: { pc: 0.45, mobile: 0.4, console: 0.15 },
  },
  'bullet-hell': {
    tam: '$600M',
    sam: '$250M',
    growth: '12% YoY',
    platforms: { pc: 0.6, console: 0.25, mobile: 0.15 },
  },
  rpg: {
    tam: '$18.5B',
    sam: '$6.2B',
    growth: '8% YoY',
    platforms: { console: 0.4, pc: 0.35, mobile: 0.25 },
  },
  'deck-builder': {
    tam: '$1.2B',
    sam: '$500M',
    growth: '25% YoY',
    platforms: { pc: 0.45, mobile: 0.4, console: 0.15 },
  },
  fps: {
    tam: '$22.8B',
    sam: '$8.5B',
    growth: '6% YoY',
    platforms: { console: 0.45, pc: 0.45, mobile: 0.1 },
  },
  survival: {
    tam: '$5.5B',
    sam: '$2.2B',
    growth: '15% YoY',
    platforms: { pc: 0.55, console: 0.35, mobile: 0.1 },
  },
  indie: {
    tam: '$8.5B',
    sam: '$3.5B',
    growth: '20% YoY',
    platforms: { pc: 0.5, console: 0.3, mobile: 0.2 },
  },
}
