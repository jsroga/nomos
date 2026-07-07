# World Building Kit — build conventions

**Dark-first system.** There is no light theme and no `.dark` toggle: `:root` holds dark HSL tokens (zinc-950 background, indigo primary). Always give a page/screen a dark root surface — `className="bg-background text-foreground"` (or `style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}`). Components on a white page look broken: ghost buttons and body text are near-white.

**Signature look: mono headings.** The shipped CSS styles `h1–h6` in JetBrains Mono (`font-mono tracking-tight`) automatically. Do not override headings back to sans — mono titles ARE the brand (Cursor-inspired). Body text is Inter (`--font-sans`); `font-syne` (Syne) exists for display accents.

## Styling idiom — Tailwind utilities over HSL token variables

All colors flow through CSS custom properties consumed as `hsl(var(--token))`. Tokens (all defined in `styles.css`): `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --destructive-foreground --border --input --ring --radius --chart-1…--chart-5 --font-sans --font-mono --font-syne`.

Utility classes verified in the shipped stylesheet: `bg-background bg-card bg-popover bg-primary bg-secondary bg-muted bg-destructive`, `text-foreground text-muted-foreground text-primary`, `border-border border-input`, `rounded-lg rounded-md` (radius derives from `--radius` = 0.5rem), `font-mono font-syne`, and hover states like `hover:bg-accent`. The stylesheet is compiled — a utility not in it does nothing; when unsure, use `style={{ … 'hsl(var(--token))' }}` which always resolves.

Entity color-coding used across the app (badges/labels): character=blue, location=green, mechanic=purple, faction=shield-gray, item/quest=amber, e.g. `className="border-blue-500/20 bg-blue-500/10 text-blue-500"`.

## Component specifics

- `Tooltip*` requires wrapping in `TooltipProvider`.
- Compound parts are separate flat exports: `Dialog`+`DialogContent/Header/Title/Footer`, `Card`+`CardHeader/Title/Description/Content/Footer`, `Tabs`+`TabsList/TabsTrigger/TabsContent`, `DropdownMenu*`, `AlertDialog*`, `Avatar`+`AvatarFallback` — compose them; never use a root alone.
- `Button` default variant is a soft indigo tint (`bg-primary/20 text-primary`), not a solid fill; `IconButton` needs `icon` and `onClick` props.
- `ConfirmDialog` and `ImageLightbox` are controlled (`open`/`isOpen` + callbacks).

## Where the truth lives

Read `styles.css` (tokens + all compiled utilities) before inventing styling; each component's `.d.ts` is its exact prop contract and its `.prompt.md` shows a verified composition.

## Idiomatic example

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from 'world-building-kit'

<div className="bg-background text-foreground min-h-screen p-8">
  <Card className="w-96">
    <CardHeader>
      <CardTitle>The Hollow Crown</CardTitle>{/* renders in mono automatically */}
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
</div>
```
