import React from 'react'
import { Button } from '@/components/Button'

export function ValidationPanel() {
  return (
    <div className="mt-auto pt-4 border-t border-border">
      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
        Validate Puzzle Logic
      </Button>
    </div>
  )
}
