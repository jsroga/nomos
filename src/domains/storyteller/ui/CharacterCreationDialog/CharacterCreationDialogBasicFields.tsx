import {
  CharacterCreationDialogField,
  fieldBorderClass,
} from './CharacterCreationDialogField'
import { CharacterCreationDialogPortraitSection } from './CharacterCreationDialogPortraitSection'
import { CharacterDialogSelect } from './CharacterDialogSelect'
import {
  CHARACTER_DIALOG_GENDER_OPTIONS,
  CHARACTER_DIALOG_MBTI_GROUPS,
  CHARACTER_DIALOG_ROLE_OPTIONS,
} from './character-dialog-select-options'
import { CharacterDialogSelectPlaceholder } from './constants/character-creation-dialog'

interface CharacterCreationDialogBasicFieldsProps {
  name: string
  setName: (value: string) => void
  role: string
  setRole: (value: string) => void
  gender: string
  setGender: (value: string) => void
  description: string
  setDescription: (value: string) => void
  mbti: string
  setMbti: (value: string) => void
  portraitUrl: string
  touched: Record<string, boolean>
  markTouched: (field: string) => void
  isGeneratingPortrait: boolean
  gridImageUrl: string | null
  onGeneratePortrait: () => void
  onShowVariantPicker: () => void
  onSetGridImageUrl: (url: string) => void
}

export function CharacterCreationDialogBasicFields({
  name,
  setName,
  role,
  setRole,
  gender,
  setGender,
  description,
  setDescription,
  mbti,
  setMbti,
  portraitUrl,
  touched,
  markTouched,
  isGeneratingPortrait,
  gridImageUrl,
  onGeneratePortrait,
  onShowVariantPicker,
  onSetGridImageUrl,
}: CharacterCreationDialogBasicFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <CharacterCreationDialogField
          label="Name"
          required
          touched={Boolean(touched.name)}
          isValid={Boolean(name)}
          errorMessage="Name is required"
        >
          <input
            className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${fieldBorderClass(Boolean(touched.name && !name))}`}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => markTouched('name')}
            placeholder="Character Name"
          />
        </CharacterCreationDialogField>

        <div className="grid grid-cols-2 gap-4">
          <CharacterCreationDialogField
            label="Role"
            required
            touched={Boolean(touched.role)}
            isValid={Boolean(role)}
            errorMessage="Role is required"
          >
            <CharacterDialogSelect
              value={role}
              placeholder={CharacterDialogSelectPlaceholder.Role}
              ariaLabel={CharacterDialogSelectPlaceholder.Role}
              invalid={Boolean(touched.role && !role)}
              options={CHARACTER_DIALOG_ROLE_OPTIONS}
              onChange={setRole}
              onBlur={() => markTouched('role')}
            />
          </CharacterCreationDialogField>

          <CharacterCreationDialogField
            label="Gender"
            required
            touched={Boolean(touched.gender)}
            isValid={Boolean(gender)}
            errorMessage="Gender is required"
          >
            <CharacterDialogSelect
              value={gender}
              placeholder={CharacterDialogSelectPlaceholder.Gender}
              ariaLabel={CharacterDialogSelectPlaceholder.Gender}
              invalid={Boolean(touched.gender && !gender)}
              options={CHARACTER_DIALOG_GENDER_OPTIONS}
              onChange={setGender}
              onBlur={() => markTouched('gender')}
            />
          </CharacterCreationDialogField>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-2">
          <CharacterCreationDialogField
            label="Description"
            required
            touched={Boolean(touched.description)}
            isValid={Boolean(description)}
            errorMessage="Description is required"
          >
            <textarea
              className={`w-full h-32 bg-background border rounded-md px-3 py-2 text-sm resize-none focus:outline-none ${fieldBorderClass(Boolean(touched.description && !description))}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={() => markTouched('description')}
              placeholder="Describe appearance, personality, and background..."
            />
          </CharacterCreationDialogField>

          <CharacterCreationDialogField
            label="MBTI"
            required
            touched={Boolean(touched.mbti)}
            isValid={Boolean(mbti)}
            errorMessage="MBTI is required"
          >
            <CharacterDialogSelect
              value={mbti}
              placeholder={CharacterDialogSelectPlaceholder.Mbti}
              ariaLabel={CharacterDialogSelectPlaceholder.Mbti}
              invalid={Boolean(touched.mbti && !mbti)}
              groups={CHARACTER_DIALOG_MBTI_GROUPS}
              onChange={setMbti}
              onBlur={() => markTouched('mbti')}
            />
          </CharacterCreationDialogField>
        </div>

        <CharacterCreationDialogPortraitSection
          name={name}
          description={description}
          portraitUrl={portraitUrl}
          isGeneratingPortrait={isGeneratingPortrait}
          gridImageUrl={gridImageUrl}
          onGeneratePortrait={onGeneratePortrait}
          onShowVariantPicker={onShowVariantPicker}
          onSetGridImageUrl={onSetGridImageUrl}
        />
      </div>
    </>
  )
}
