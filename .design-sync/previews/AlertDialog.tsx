import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'world-building-kit'

export const DeleteConfirmation = () => (
  <div className="h-[400px]">
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete episode 14?</AlertDialogTitle>
          <AlertDialogDescription>
            "The Cartographer's Debt" and its 12 beats will be permanently removed. Characters
            and locations referenced by this episode are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep episode</AlertDialogCancel>
          <AlertDialogAction>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
)
