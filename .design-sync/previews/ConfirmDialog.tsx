import { ConfirmDialog } from 'world-building-kit'

export const DestructiveConfirm = () => (
  <div className="h-[400px]">
    <ConfirmDialog
      open
      onOpenChange={() => {}}
      title="Regenerate the season arc?"
      description="This replaces the current 22-episode outline with a fresh draft. Locked episodes are preserved; everything else is rewritten."
      confirmLabel="Regenerate"
      cancelLabel="Cancel"
      variant="destructive"
      onConfirm={() => {}}
    />
  </div>
)
