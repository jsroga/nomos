import { ImageLightbox } from 'world-building-kit'

const placeholder =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#18181b"/><rect x="40" y="40" width="880" height="460" rx="12" fill="none" stroke="#3f3f46" stroke-width="2"/><text x="480" y="260" fill="#a1a1aa" font-family="monospace" font-size="28" text-anchor="middle">Concept art — Ashen Keep</text><text x="480" y="300" fill="#52525b" font-family="monospace" font-size="18" text-anchor="middle">generated 2026-07-07 · flux-pro</text></svg>`,
  )

export const OpenLightbox = () => (
  <div className="h-[520px]">
    <ImageLightbox
      isOpen
      onClose={() => {}}
      imageSrc={placeholder}
      imageAlt="Concept art — Ashen Keep"
      onNext={() => {}}
      onPrev={() => {}}
      hasNext
      hasPrev
    />
  </div>
)
