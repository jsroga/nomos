import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/Card'

const meta = {
  title: 'Primitives/Card',
  component: Card,
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>The Hollow Crown</CardTitle>
        <CardDescription>Dark-fantasy series bible — 3 seasons planned</CardDescription>
      </CardHeader>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>The Hollow Crown</CardTitle>
        <CardDescription>Dark-fantasy series bible — 3 seasons planned</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">22 episodes drafted.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant="secondary">Storyteller</Badge>
        <Button size="sm">Open writers room</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithBadge: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Episode 14</CardTitle>
          <Badge>Locked</Badge>
        </div>
        <CardDescription>The Cartographer&apos;s Debt</CardDescription>
      </CardHeader>
    </Card>
  ),
}

export const EmptyContent: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Storyboard</CardTitle>
        <CardDescription>No frames yet.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Generate a beat to populate this card.</p>
      </CardContent>
    </Card>
  ),
}

export const NestedActions: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Game loop: Forage → Craft → Trade</CardTitle>
        <CardDescription>Core loop, 3 stages, ~90s per cycle</CardDescription>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline">
          Duplicate
        </Button>
        <Button size="sm">Open loop</Button>
      </CardFooter>
    </Card>
  ),
}
