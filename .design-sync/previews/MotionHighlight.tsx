import { MotionHighlight } from 'world-building-kit'

export const ModuleList = () => (
  <div className="w-64">
    <MotionHighlight
      items={['Storyteller', 'Loop Creator', 'Interior Designer', 'Asset Exporter']}
      onSelect={() => {}}
    />
  </div>
)
