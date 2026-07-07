import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from 'world-building-kit'

export const NewCharacterDialog = () => (
  <div className="h-[440px]">
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New character</DialogTitle>
          <DialogDescription>
            Added to the bible and available to every episode.
          </DialogDescription>
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
  </div>
)
