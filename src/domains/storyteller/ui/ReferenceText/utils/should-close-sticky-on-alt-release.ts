/** Close the sticky tooltip only when Option/Alt is released, not on ordinary open. */
export function shouldCloseStickyOnAltRelease(
  wasAltHeld: boolean,
  isAltHeld: boolean,
  isHoveringContent: boolean
): boolean {
  return wasAltHeld && !isAltHeld && !isHoveringContent
}
