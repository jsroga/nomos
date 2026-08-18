import type { Meta, StoryObj } from '@storybook/react-vite'
import { MasterPromptField } from '@/components/MasterPromptField'
import { MasterPromptSuggestion } from '@/components/MasterPromptField/MasterPromptSuggestion'
import { MasterPromptSuggestMode } from '@/components/MasterPromptField/constants/master-prompt-field'
import { enumArgType } from './_helpers/arg-types'
import {
  noopAccept,
  noopChange,
  noopNext,
  noopReject,
  noopSuggest,
  noopSuggestPick,
} from './_helpers/handlers'

const meta = {
  title: 'Primitives/MasterPromptField',
  component: MasterPromptField,
  args: {
    label: 'World prompt',
    value: '',
    onChange: noopChange,
    placeholder: 'A coastal city that rebuilds itself every dawn…',
  },
  argTypes: {
    suggestMode: enumArgType(MasterPromptSuggestMode),
    suggestBusy: { control: 'boolean' },
    clamp: { control: 'boolean' },
  },
} satisfies Meta<typeof MasterPromptField>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    suggestMode: MasterPromptSuggestMode.Iterate,
    onSuggest: noopSuggest,
  },
}

export const FilledClamped: Story = {
  args: {
    value:
      'A deposed cartographer discovers the kingdom’s maps are rewriting themselves — and whoever controls the ink controls the borders. Ashen Keep’s upper battlements are a ledger. When the ink dries, the census updates in the World Bible.',
    clamp: true,
    suggestMode: MasterPromptSuggestMode.Iterate,
    onSuggest: noopSuggest,
  },
}

export const SuggestBusy: Story = {
  args: {
    suggestMode: MasterPromptSuggestMode.Iterate,
    suggestBusy: true,
    onSuggest: noopSuggest,
  },
}

export const SuggestionPending: Story = {
  args: {
    suggestMode: MasterPromptSuggestMode.Iterate,
    onSuggest: noopSuggest,
    suggestion: (
      <MasterPromptSuggestion
        idea="A city whose streets rearrange when someone tells a lie."
        onAccept={noopAccept}
        onReject={noopReject}
        onNext={noopNext}
      />
    ),
  },
}

export const MenuMode: Story = {
  args: {
    suggestMode: MasterPromptSuggestMode.Menu,
    onSuggest: noopSuggest,
    onSuggestPick: noopSuggestPick,
    suggestItems: [
      { id: 'coast', label: 'Coastal rebuild', description: 'City remade at dawn' },
      { id: 'maps', label: 'Living maps', description: 'Ink rewrites borders' },
      { id: 'oases', label: 'Story oases', description: 'Water traded for tales' },
    ],
  },
}
