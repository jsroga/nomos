import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import { CharacterCreationDialogField } from './CharacterCreationDialogField'
import { CharacterDialogFieldLabel } from './constants/character-creation-dialog'

interface CharacterCreationDialogPsychologyFieldsProps {
  motivation: string
  setMotivation: (value: string) => void
  fatalFlaw: string
  setFatalFlaw: (value: string) => void
  secrets: string
  setSecrets: (value: string) => void
  onRefreshField?: (key: CharacterTextFieldKey) => void
  refreshDisabled?: boolean
}

export function CharacterCreationDialogPsychologyFields({
  motivation,
  setMotivation,
  fatalFlaw,
  setFatalFlaw,
  secrets,
  setSecrets,
  onRefreshField,
  refreshDisabled = false,
}: CharacterCreationDialogPsychologyFieldsProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="text-sm font-bold">Character Psychology</h3>
      <CharacterCreationDialogField
        label={CharacterDialogFieldLabel.Motivation}
        touched={false}
        isValid
        errorMessage=""
        onRefresh={
          onRefreshField ? () => onRefreshField(CharacterTextFieldKey.Motivation) : undefined
        }
        refreshDisabled={refreshDisabled}
      >
        <input
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
          value={motivation}
          onChange={e => setMotivation(e.target.value)}
          placeholder="What truly drives this character?"
        />
      </CharacterCreationDialogField>
      <div className="grid grid-cols-2 gap-4">
        <CharacterCreationDialogField
          label={CharacterDialogFieldLabel.FatalFlaw}
          touched={false}
          isValid
          errorMessage=""
          labelClassName="text-destructive/80"
          onRefresh={
            onRefreshField ? () => onRefreshField(CharacterTextFieldKey.FatalFlaw) : undefined
          }
          refreshDisabled={refreshDisabled}
        >
          <input
            className="w-full bg-background border border-destructive/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-destructive/50 focus:outline-none"
            value={fatalFlaw}
            onChange={e => setFatalFlaw(e.target.value)}
            placeholder="The weakness that could undo them"
          />
        </CharacterCreationDialogField>
        <CharacterCreationDialogField
          label={CharacterDialogFieldLabel.Secrets}
          touched={false}
          isValid
          errorMessage=""
          labelClassName="text-amber-500/80"
          onRefresh={
            onRefreshField ? () => onRefreshField(CharacterTextFieldKey.Secrets) : undefined
          }
          refreshDisabled={refreshDisabled}
        >
          <input
            className="w-full bg-background border border-amber-500/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
            value={secrets}
            onChange={e => setSecrets(e.target.value)}
            placeholder="What they hide from everyone"
          />
        </CharacterCreationDialogField>
      </div>
    </div>
  )
}
