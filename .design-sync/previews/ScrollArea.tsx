import { Badge, ScrollArea } from 'world-building-kit'

const episodes = [
  'The Wet Ink', 'Borders Move at Night', 'The Cartographer’s Debt', 'Salt and Parchment',
  'The Unmapped Room', 'Two Kings, One River', 'Maren’s Ledger', 'The Ink Runs Dry',
  'A Coast That Wasn’t', 'The Copyist', 'Redrawn', 'The Hollow Crown',
]

export const EpisodeList = () => (
  <ScrollArea className="h-56 w-80 rounded-md border border-border p-3">
    <div className="grid gap-2">
      {episodes.map((t, i) => (
        <div key={t} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent">
          <span>
            <span className="mr-2 font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
            {t}
          </span>
          {i < 3 && <Badge variant="secondary">Canon</Badge>}
        </div>
      ))}
    </div>
  </ScrollArea>
)
