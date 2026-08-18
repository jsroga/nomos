import { useEffect, type ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import { TooltipProvider } from '@/components/Tooltip'
import '../.design-sync/fonts-header.css'
import '../src/app/globals.css'
import '../.design-sync/fonts-vars.css'

const HtmlClass = {
  Dark: 'dark',
} as const

function PreviewFrame({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add(HtmlClass.Dark)
  }, [])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background p-8 font-sans text-foreground antialiased">
        {children}
      </div>
    </TooltipProvider>
  )
}

const withAppChrome: Decorator = Story => (
  <PreviewFrame>
    <Story />
  </PreviewFrame>
)

const preview: Preview = {
  decorators: [withAppChrome],
  parameters: {
    backgrounds: { disable: true },
    layout: 'fullscreen',
  },
}

export default preview
