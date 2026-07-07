import { Tabs, TabsContent, TabsList, TabsTrigger } from 'world-building-kit'

export const WorkspaceTabs = () => (
  <Tabs defaultValue="bible" className="w-[28rem]">
    <TabsList>
      <TabsTrigger value="bible">Bible</TabsTrigger>
      <TabsTrigger value="episodes">Episodes</TabsTrigger>
      <TabsTrigger value="characters">Characters</TabsTrigger>
      <TabsTrigger value="locations">Locations</TabsTrigger>
    </TabsList>
    <TabsContent value="bible">
      <p className="pt-3 text-sm text-muted-foreground">
        Series premise, tone, and canon rules. The single source of truth every episode is
        checked against.
      </p>
    </TabsContent>
    <TabsContent value="episodes">
      <p className="pt-3 text-sm text-muted-foreground">22 drafted episodes.</p>
    </TabsContent>
    <TabsContent value="characters">
      <p className="pt-3 text-sm text-muted-foreground">14 characters.</p>
    </TabsContent>
    <TabsContent value="locations">
      <p className="pt-3 text-sm text-muted-foreground">6 locations.</p>
    </TabsContent>
  </Tabs>
)
