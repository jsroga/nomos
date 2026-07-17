import React from 'react'
import {
  CharacterCreationDialogField,
  fieldBorderClass,
} from './CharacterCreationDialogField'
import { CharacterCreationDialogPortraitSection } from './CharacterCreationDialogPortraitSection'

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
            <select
              className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${fieldBorderClass(Boolean(touched.role && !role))}`}
              value={role}
              onChange={e => setRole(e.target.value)}
              onBlur={() => markTouched('role')}
            >
              <option value="Protagonist">Protagonist</option>
              <option value="Antagonist">Antagonist</option>
              <option value="Supporting">Supporting</option>
            </select>
          </CharacterCreationDialogField>

          <CharacterCreationDialogField
            label="Gender"
            required
            touched={Boolean(touched.gender)}
            isValid={Boolean(gender)}
            errorMessage="Gender is required"
          >
            <select
              className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${fieldBorderClass(Boolean(touched.gender && !gender))}`}
              value={gender}
              onChange={e => setGender(e.target.value)}
              onBlur={() => markTouched('gender')}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
            </select>
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
            <select
              className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${fieldBorderClass(Boolean(touched.mbti && !mbti))}`}
              value={mbti}
              onChange={e => setMbti(e.target.value)}
              onBlur={() => markTouched('mbti')}
            >
              <option value="">Select MBTI Type</option>
              <optgroup label="Analysts">
                <option value="INTJ">INTJ - Architect</option>
                <option value="INTP">INTP - Logician</option>
                <option value="ENTJ">ENTJ - Commander</option>
                <option value="ENTP">ENTP - Debater</option>
              </optgroup>
              <optgroup label="Diplomats">
                <option value="INFJ">INFJ - Advocate</option>
                <option value="INFP">INFP - Mediator</option>
                <option value="ENFJ">ENFJ - Protagonist</option>
                <option value="ENFP">ENFP - Campaigner</option>
              </optgroup>
              <optgroup label="Sentinels">
                <option value="ISTJ">ISTJ - Logistician</option>
                <option value="ISFJ">ISFJ - Defender</option>
                <option value="ESTJ">ESTJ - Executive</option>
                <option value="ESFJ">ESFJ - Consul</option>
              </optgroup>
              <optgroup label="Explorers">
                <option value="ISTP">ISTP - Virtuoso</option>
                <option value="ISFP">ISFP - Adventurer</option>
                <option value="ESTP">ESTP - Entrepreneur</option>
                <option value="ESFP">ESFP - Entertainer</option>
              </optgroup>
            </select>
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
