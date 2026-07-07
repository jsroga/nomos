import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from 'world-building-kit'

export const EpisodeActions = () => (
  <div className="flex h-[360px] justify-center pt-2">
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Episode actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Episode 14</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          Open in writers room
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Regenerate beats</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>Locked</DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">Delete episode</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
)
