import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card'
import { Label } from '@/components/Label'

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Faces: Story = {
  render: () => (
    <div className="grid max-w-xl gap-8">
      <div className="grid gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Inter — body (font-sans)
        </p>
        <p className="font-sans text-base leading-7">
          A deposed cartographer discovers the kingdom&apos;s maps are rewriting themselves — and
          whoever controls the ink controls the borders.
        </p>
      </div>
      <div className="grid gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          JetBrains Mono — headings (globals h1–h6)
        </p>
        <h1>The Hollow Crown</h1>
        <h2>Season bible</h2>
        <h3>Episode 14</h3>
      </div>
      <div className="grid gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Syne — display (font-syne)
        </p>
        <p className="font-syne text-4xl font-extrabold tracking-tight">World Building Kit</p>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Product chrome</CardTitle>
          <CardDescription>Same faces as the app — Inter body, mono title.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="series">Series title</Label>
            <p id="series" className="text-sm text-muted-foreground">
              The Hollow Crown
            </p>
          </div>
          <Button size="sm">Open writers room</Button>
        </CardContent>
      </Card>
    </div>
  ),
}
