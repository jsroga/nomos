'use client'

import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/DropdownMenu'
import { HtmlElementType } from '@/shared/data/constants/protocol'
import { cn } from '@/shared/data/utils'
import { fieldBorderClass } from './CharacterCreationDialogField'

export interface CharacterDialogSelectOption {
  value: string
  label: string
}

export interface CharacterDialogSelectGroup {
  label: string
  options: readonly CharacterDialogSelectOption[]
}

interface CharacterDialogSelectProps {
  value: string
  placeholder: string
  ariaLabel: string
  invalid: boolean
  options?: readonly CharacterDialogSelectOption[]
  groups?: readonly CharacterDialogSelectGroup[]
  onChange: (value: string) => void
  onBlur: () => void
}

export enum CharacterDialogSelectClass {
  Trigger = 'w-full justify-between font-normal',
  Placeholder = 'text-muted-foreground',
  Menu = 'max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto',
}

function optionLabel(
  value: string,
  options: readonly CharacterDialogSelectOption[],
): string | undefined {
  return options.find(option => option.value === value)?.label
}

function selectedLabel(input: {
  value: string
  options?: readonly CharacterDialogSelectOption[]
  groups?: readonly CharacterDialogSelectGroup[]
}): string | undefined {
  if (!input.value) return undefined
  const fromOptions = optionLabel(input.value, input.options ?? [])
  if (fromOptions) return fromOptions
  for (const group of input.groups ?? []) {
    const fromGroup = optionLabel(input.value, group.options)
    if (fromGroup) return fromGroup
  }
  return undefined
}

export function CharacterDialogSelect({
  value,
  placeholder,
  ariaLabel,
  invalid,
  options,
  groups,
  onChange,
  onBlur,
}: CharacterDialogSelectProps) {
  const label = selectedLabel({ value, options, groups }) ?? placeholder
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type={HtmlElementType.Button}
          variant="outline"
          aria-label={ariaLabel}
          onBlur={onBlur}
          className={cn(
            CharacterDialogSelectClass.Trigger,
            fieldBorderClass(invalid),
            !value && CharacterDialogSelectClass.Placeholder,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={CharacterDialogSelectClass.Menu}>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options?.map(option => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
          {groups?.map(group => (
            <DropdownMenuGroup key={group.label}>
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              {group.options.map(option => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
