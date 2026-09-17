import { useEffect, useRef, useState } from 'react'
import { MASTER_PROMPT_SAVE_DEBOUNCE_MS } from './constants/master-prompt-field'
import {
  decideMasterPromptHydrate,
  MasterPromptHydrateAction,
} from './decide-master-prompt-hydrate'

export function useMasterPromptAutosave(
  initialPrompt: string,
  hydrateKey: string,
  onSave: (prompt: string) => void,
) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const dirtyRef = useRef(false)
  const lastHydrateKeyRef = useRef<string | null>(null)
  const lastSentRef = useRef(initialPrompt)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptRef = useRef(prompt)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    promptRef.current = prompt
  }, [prompt])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const persistPrompt = (value: string) => {
    lastSentRef.current = value
    onSaveRef.current(value)
  }

  useEffect(() => {
    const serverPrompt = initialPrompt || ''
    const action = decideMasterPromptHydrate({
      hydrateKey,
      lastHydrateKey: lastHydrateKeyRef.current,
      serverPrompt,
      localPrompt: promptRef.current,
      dirty: dirtyRef.current,
      lastSent: lastSentRef.current,
    })
    lastHydrateKeyRef.current = hydrateKey

    if (action === MasterPromptHydrateAction.ApplyServer) {
      dirtyRef.current = false
      lastSentRef.current = serverPrompt
      setPrompt(serverPrompt)
      return
    }
    if (action === MasterPromptHydrateAction.Synced) {
      dirtyRef.current = false
      lastSentRef.current = serverPrompt
      return
    }
    if (action === MasterPromptHydrateAction.PersistLocal) {
      persistPrompt(promptRef.current)
    }
  }, [hydrateKey, initialPrompt])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (next: string) => {
    dirtyRef.current = true
    setPrompt(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      persistPrompt(next)
    }, MASTER_PROMPT_SAVE_DEBOUNCE_MS)
  }

  const persistNow = (value: string) => {
    dirtyRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setPrompt(value)
    persistPrompt(value)
  }

  return { prompt, handleChange, persistNow }
}
