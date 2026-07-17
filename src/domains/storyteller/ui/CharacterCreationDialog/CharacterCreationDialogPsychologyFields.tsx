import React from 'react'

interface CharacterCreationDialogPsychologyFieldsProps {
  archetype: string
  setArchetype: (value: string) => void
  voiceSignature: string
  setVoiceSignature: (value: string) => void
  motivation: string
  setMotivation: (value: string) => void
  fatalFlaw: string
  setFatalFlaw: (value: string) => void
  secrets: string
  setSecrets: (value: string) => void
}

export function CharacterCreationDialogPsychologyFields({
  archetype,
  setArchetype,
  voiceSignature,
  setVoiceSignature,
  motivation,
  setMotivation,
  fatalFlaw,
  setFatalFlaw,
  secrets,
  setSecrets,
}: CharacterCreationDialogPsychologyFieldsProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="text-sm font-bold">Character Psychology</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Archetype</label>
          <input
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            value={archetype}
            onChange={e => setArchetype(e.target.value)}
            placeholder="e.g. The Reluctant Hero, The Trickster"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Voice Signature</label>
          <input
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            value={voiceSignature}
            onChange={e => setVoiceSignature(e.target.value)}
            placeholder="e.g. Clipped military cadence, dry humor"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Motivation</label>
        <input
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          value={motivation}
          onChange={e => setMotivation(e.target.value)}
          placeholder="What truly drives this character?"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-destructive/80">Fatal Flaw</label>
          <input
            className="w-full bg-background border border-destructive/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-destructive/50 focus:outline-none"
            value={fatalFlaw}
            onChange={e => setFatalFlaw(e.target.value)}
            placeholder="The weakness that could undo them"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-amber-500/80">Secret</label>
          <input
            className="w-full bg-background border border-amber-500/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
            value={secrets}
            onChange={e => setSecrets(e.target.value)}
            placeholder="What they hide from everyone"
          />
        </div>
      </div>
    </div>
  )
}
