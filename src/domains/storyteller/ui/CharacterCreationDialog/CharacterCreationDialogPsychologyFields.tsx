import { useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { CharacterTextFieldKey } from '@/domains/storyteller/core/character-missing-fields'
import { CharacterCreationDialogField } from './CharacterCreationDialogField'
import { CharacterDialogSelect } from './CharacterDialogSelect'
import { CHARACTER_DIALOG_MBTI_GROUPS } from './character-dialog-select-options'
import {
  CharacterDialogFieldLabel,
  CharacterDialogPsychologyClass,
  CharacterDialogPsychologyCopy,
  CharacterDialogSelectPlaceholder,
} from './constants/character-creation-dialog'

interface CharacterCreationDialogPsychologyFieldsProps {
  mbti: string
  setMbti: (value: string) => void
  motivation: string
  setMotivation: (value: string) => void
  fatalFlaw: string
  setFatalFlaw: (value: string) => void
  secrets: string
  setSecrets: (value: string) => void
  touched: Record<string, boolean>
  markTouched: (field: string) => void
  onRefreshField?: (key: CharacterTextFieldKey) => void
  refreshDisabled?: boolean
}

export function CharacterCreationDialogPsychologyFields({
  mbti,
  setMbti,
  motivation,
  setMotivation,
  fatalFlaw,
  setFatalFlaw,
  secrets,
  setSecrets,
  touched,
  markTouched,
  onRefreshField,
  refreshDisabled = false,
}: CharacterCreationDialogPsychologyFieldsProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const mbtiInvalid = Boolean(touched.mbti && !mbti)

  useEffect(() => {
    if (!mbtiInvalid) return
    const panel = detailsRef.current
    if (!panel) return
    panel.open = true
  }, [mbtiInvalid])

  return (
    <details ref={detailsRef} className={CharacterDialogPsychologyClass.Root}>
      <summary className={CharacterDialogPsychologyClass.Summary}>
        <ChevronDown className={CharacterDialogPsychologyClass.Chevron} />
        {CharacterDialogPsychologyCopy.Title}
      </summary>
      <div className={CharacterDialogPsychologyClass.Body}>
        <CharacterCreationDialogField
          label={CharacterDialogFieldLabel.Mbti}
          required
          touched={Boolean(touched.mbti)}
          isValid={Boolean(mbti)}
          errorMessage="MBTI is required"
          onRefresh={
            onRefreshField ? () => onRefreshField(CharacterTextFieldKey.Mbti) : undefined
          }
          refreshDisabled={refreshDisabled}
        >
          <CharacterDialogSelect
            value={mbti}
            placeholder={CharacterDialogSelectPlaceholder.Mbti}
            ariaLabel={CharacterDialogSelectPlaceholder.Mbti}
            invalid={mbtiInvalid}
            groups={CHARACTER_DIALOG_MBTI_GROUPS}
            onChange={setMbti}
            onBlur={() => markTouched('mbti')}
          />
        </CharacterCreationDialogField>
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
    </details>
  )
}
