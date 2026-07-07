import { DomainSidebar, Label, Slider, Switch } from 'world-building-kit'

export const WorldGenSidebar = () => (
  <div className="h-[420px] overflow-hidden rounded-lg border border-border">
    <DomainSidebar header="World generation" defaultWidth={300}>
      <div className="grid gap-5 p-4">
        <div className="grid gap-3">
          <div className="flex justify-between text-sm">
            <Label>Terrain roughness</Label>
            <span className="text-muted-foreground">0.4</span>
          </div>
          <Slider defaultValue={[40]} max={100} />
        </div>
        <div className="grid gap-3">
          <div className="flex justify-between text-sm">
            <Label>Settlement density</Label>
            <span className="text-muted-foreground">0.6</span>
          </div>
          <Slider defaultValue={[60]} max={100} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="rivers">Generate rivers</Label>
          <Switch id="rivers" defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="ruins">Ancient ruins</Label>
          <Switch id="ruins" />
        </div>
      </div>
    </DomainSidebar>
  </div>
)
