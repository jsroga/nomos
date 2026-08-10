'use client'

import { Loader2, Plus } from 'lucide-react'
import {
  PROJECT_SELECTION_COMPOSE_HINT,
  PROJECT_SELECTION_COMPOSE_LABEL,
  PROJECT_SELECTION_CREATE_LABEL,
  PROJECT_SELECTION_FOCUS_RING,
  PROJECT_SELECTION_FOCUS_RING_VISIBLE,
  PROJECT_SELECTION_NAME_PLACEHOLDER,
} from '../constants/project-selection'

type ProjectSelectionComposeBarProps = {
  value: string
  isCreating: boolean
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ProjectSelectionComposeBar({
  value,
  isCreating,
  onChange,
  onSubmit,
}: ProjectSelectionComposeBarProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-wrap items-center gap-x-7 gap-y-4 rounded-[14px] border border-dashed border-[hsl(235_88%_65%/0.38)] bg-[hsl(235_88%_65%/0.05)] px-6 py-5"
    >
      <div className="flex w-[190px] shrink-0 flex-col gap-1.5">
        <span className="block font-mono text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-[hsl(235_88%_74%)]">
          {PROJECT_SELECTION_COMPOSE_LABEL}
        </span>
        <span className="block font-sans text-[13px] leading-snug text-white/50">
          {PROJECT_SELECTION_COMPOSE_HINT}
        </span>
      </div>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={PROJECT_SELECTION_NAME_PLACEHOLDER}
        autoComplete="off"
        className={`h-[46px] min-w-[200px] flex-1 rounded-[9px] border border-white/[0.12] bg-black/35 px-[15px] font-sans text-[15px] text-[hsl(0_0%_98%)] placeholder:text-white/30 transition-[border-color,box-shadow] duration-[160ms] autofill:shadow-[inset_0_0_0_1000px_rgb(0,0,0)] ${PROJECT_SELECTION_FOCUS_RING}`}
      />

      <button
        type="submit"
        disabled={isCreating || !value.trim()}
        className={`inline-flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40 ${PROJECT_SELECTION_FOCUS_RING_VISIBLE}`}
      >
        {isCreating ? (
          <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden />
        ) : (
          <Plus size={15} className="shrink-0" aria-hidden />
        )}
        <span>{PROJECT_SELECTION_CREATE_LABEL}</span>
      </button>
    </form>
  )
}
