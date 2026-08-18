import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/Button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/AlertDialog'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { OverlayCanvas, overlayStoryParams } from './_helpers/overlay'

const meta = {
  title: 'Overlays/AlertDialog',
  component: AlertDialog,
  parameters: overlayStoryParams(),
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: () => (
    <OverlayCanvas>
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the writers room?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved beat notes stay in the editor until you discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OverlayCanvas>
  ),
}

export const Destructive: Story = {
  render: () => (
    <OverlayCanvas>
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete episode 14?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;The Cartographer&apos;s Debt&quot; and its 12 beats will be permanently removed.
              Characters and locations referenced by this episode are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep episode</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OverlayCanvas>
  ),
}

export const LongCopy: Story = {
  render: () => (
    <OverlayCanvas>
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the season arc?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current 22-episode outline with a fresh draft. Locked episodes are
              preserved; everything else is rewritten. Critic passes re-run on the new outline, and
              any open plot threads flagged by consistency check will be re-evaluated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OverlayCanvas>
  ),
}

export const WithForm: Story = {
  render: () => (
    <OverlayCanvas>
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename episode</AlertDialogTitle>
            <AlertDialogDescription>Shown on the cork board and in exports.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="ep-title">Title</Label>
            <Input id="ep-title" defaultValue="The Cartographer's Debt" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Save title</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OverlayCanvas>
  ),
}

export const Closed: Story = {
  render: () => (
    <OverlayCanvas>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Open alert</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Closed until triggered</AlertDialogTitle>
            <AlertDialogDescription>Click the button to open.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OverlayCanvas>
  ),
}
