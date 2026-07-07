import { Avatar, AvatarFallback } from 'world-building-kit'

export const CharacterAvatars = () => (
  <div className="flex items-center gap-3">
    <Avatar>
      <AvatarFallback>MV</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>KT</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback className="bg-primary/20 text-primary">AI</AvatarFallback>
    </Avatar>
  </div>
)

export const Sizes = () => (
  <div className="flex items-end gap-3">
    <Avatar className="h-6 w-6 text-[10px]">
      <AvatarFallback>S</AvatarFallback>
    </Avatar>
    <Avatar>
      <AvatarFallback>M</AvatarFallback>
    </Avatar>
    <Avatar className="h-14 w-14">
      <AvatarFallback>L</AvatarFallback>
    </Avatar>
  </div>
)
