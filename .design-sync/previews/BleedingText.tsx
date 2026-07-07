import { BleedingText } from 'world-building-kit'

export const Title = () => (
  <div className="flex h-40 items-center justify-center">
    <BleedingText text="The Hollow Crown" className="text-4xl font-bold" />
  </div>
)

export const CustomColors = () => (
  <div className="flex h-40 items-center justify-center">
    <BleedingText
      text="Season Two"
      className="text-3xl font-bold"
      textColor="#8b5cf6"
      particleColor="#22d3ee"
    />
  </div>
)
