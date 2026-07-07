import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
} from 'world-building-kit'

export const ProjectCard = () => (
  <Card className="w-96">
    <CardHeader>
      <CardTitle>The Hollow Crown</CardTitle>
      <CardDescription>Dark-fantasy series bible — 3 seasons planned</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        A deposed cartographer discovers the kingdom's maps are rewriting themselves — and
        whoever controls the ink controls the borders. 14 characters, 6 locations, 22 episodes
        drafted.
      </p>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Badge variant="secondary">Storyteller</Badge>
      <Button size="sm">Open writers room</Button>
    </CardFooter>
  </Card>
)

export const StatCard = () => (
  <div className="grid w-[28rem] grid-cols-2 gap-4">
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Episodes drafted</CardDescription>
        <CardTitle className="text-3xl">22</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">+4 since last session</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Open plot threads</CardDescription>
        <CardTitle className="text-3xl">7</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">2 flagged by consistency check</p>
      </CardContent>
    </Card>
  </div>
)

export const SimpleCard = () => (
  <Card className="w-80">
    <CardHeader>
      <CardTitle>Game loop: Forage → Craft → Trade</CardTitle>
      <CardDescription>Core loop, 3 stages, ~90s per cycle</CardDescription>
    </CardHeader>
  </Card>
)
