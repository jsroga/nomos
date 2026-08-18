import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/Dialog'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { OverlayCanvas, overlayStoryParams } from './_helpers/overlay'

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
  parameters: overlayStoryParams(),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: () => (
    <OverlayCanvas>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New character</DialogTitle>
            <DialogDescription>Added to the bible and available to every episode.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost">Cancel</Button>
            <Button>Create character</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlayCanvas>
  ),
}

export const LongBody: Story = {
  render: () => (
    <OverlayCanvas>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Season arc notes</DialogTitle>
            <DialogDescription>
              The cartographer&apos;s debt compounds across twenty-two episodes. Each map revision
              rewrites a border, a loyalty, or a death. Locked episodes keep their current outline;
              everything else is fair game for regeneration.
            </DialogDescription>
          </DialogHeader>
          <p className="max-h-40 overflow-y-auto text-sm text-muted-foreground">
            Ashen Keep&apos;s upper battlements are no longer a set piece — they are a ledger. When
            the ink dries, the kingdom&apos;s census updates in the World Bible. Characters who
            vanish from the map still occupy scenes until a critic pass flags the contradiction.
          </p>
          <DialogFooter>
            <Button variant="outline">Keep draft</Button>
            <Button>Apply notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlayCanvas>
  ),
}

export const WithForm: Story = {
  render: () => (
    <OverlayCanvas>
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New character</DialogTitle>
            <DialogDescription>Added to the bible and available to every episode.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="char-name">Name</Label>
              <Input id="char-name" defaultValue="Maren Voss" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="char-role">Role</Label>
              <Input id="char-role" placeholder="e.g. deuteragonist, antagonist" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost">Cancel</Button>
            <Button>Create character</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlayCanvas>
  ),
}

export const DestructiveFooter: Story = {
  render: () => (
    <OverlayCanvas>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete episode 14?</DialogTitle>
            <DialogDescription>
              Beats and storyboard frames for this episode are removed. Characters stay in the bible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost">Keep episode</Button>
            <Button variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OverlayCanvas>
  ),
}

export const Closed: Story = {
  render: () => (
    <OverlayCanvas>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Closed until triggered</DialogTitle>
            <DialogDescription>Click the button to open.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </OverlayCanvas>
  ),
}
