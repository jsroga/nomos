import { useEffect, useRef, useState } from 'react'
import { EpisodePremise } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'

export type LocalPremise = Partial<EpisodePremise> & { poster?: string }

export function useEpisodePremiseLocalState(premise: EpisodePremise | null, isEditing: boolean) {
  const [localPremise, setLocalPremise] = useState<LocalPremise>(premise || {})
  const lastSavedPremise = useRef<string | null>(null)

  useEffect(() => {
    if (isEditing || !premise) return

    const premiseStr = JSON.stringify(premise)

    if (lastSavedPremise.current) {
      if (lastSavedPremise.current !== premiseStr) return
      lastSavedPremise.current = null
    }

    queueMicrotask(() => {
      setLocalPremise(current => {
        if (JSON.stringify(current) === premiseStr) return current
        return premise
      })
    })
  }, [premise, isEditing])

  const handleSave = (onUpdate: (updates: LocalPremise) => void) => {
    if (!localPremise) return
    const toSave = localPremise
    lastSavedPremise.current = JSON.stringify(toSave)
    onUpdate(toSave)
  }

  const handleChange = <K extends keyof EpisodePremise>(field: K, value: EpisodePremise[K]) => {
    setLocalPremise(prev => ({ ...prev, [field]: value }))
  }

  return {
    localPremise,
    setLocalPremise,
    handleSave,
    handleChange,
  }
}
