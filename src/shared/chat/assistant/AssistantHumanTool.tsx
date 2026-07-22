'use client'

/**
 * Human-in-the-loop question UI (roadmap B / ASSISTANT-UI-SWAP-TRACKER). Renders
 * a standalone card whenever an agent calls the `askUser` tool, letting the user
 * answer inline — the assistant-ui replacement for the old `QuestionComponent` /
 * `onQuestionAnswer` flow. The answer is returned to the run via `addResult`.
 *
 * An agent opts in by exposing an `askUser` tool (args: { question, options? }).
 * Mount <AskUserToolUI /> inside the AssistantRuntimeProvider to register it.
 */

import { useState } from 'react'
import { makeAssistantToolUI } from '@assistant-ui/react'
import { isPlainObject, readString } from '@/shared/data/json-guards'

const ASK_USER_TOOL_NAME = 'askUser'
const DISPLAY_STANDALONE = 'standalone'
const SUBMIT_LABEL = 'Send'
const ANSWER_PREFIX = 'You answered: '
const INPUT_PLACEHOLDER = 'Type your answer…'
const KEY_QUESTION = 'question'
const KEY_OPTIONS = 'options'
const KEY_ANSWER = 'answer'

interface AskUserArgs {
  question?: string
  options?: string[]
}

interface AskUserResult {
  answer: string
}

function readArgs(args: unknown): AskUserArgs {
  if (!isPlainObject(args)) return {}
  const rawOptions = args[KEY_OPTIONS]
  const options = Array.isArray(rawOptions)
    ? rawOptions.map(readString).filter((o): o is string => typeof o === 'string')
    : undefined
  return { question: readString(args[KEY_QUESTION]), options }
}

function answerText(result: unknown): string | null {
  if (!isPlainObject(result)) return null
  return readString(result[KEY_ANSWER]) ?? null
}

export const AskUserToolUI = makeAssistantToolUI<AskUserArgs, AskUserResult>({
  toolName: ASK_USER_TOOL_NAME,
  display: DISPLAY_STANDALONE,
  render: ({ args, result, addResult }) => {
    const parsed = readArgs(args)
    const answered = answerText(result)
    return (
      <div className="my-1 rounded-md border border-black/15 p-3 text-sm dark:border-white/15">
        <div className="font-medium">{parsed.question ?? '…'}</div>
        {answered !== null ? (
          <div className="mt-1 text-xs opacity-60">
            {ANSWER_PREFIX}
            {answered}
          </div>
        ) : (
          <AskUserForm
            options={parsed.options}
            onAnswer={answer => addResult({ answer })}
          />
        )}
      </div>
    )
  },
})

function AskUserForm({
  options,
  onAnswer,
}: {
  options?: string[]
  onAnswer: (answer: string) => void
}) {
  const [value, setValue] = useState('')

  if (options && options.length > 0) {
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(option)}
            className="rounded-full border border-black/20 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            {option}
          </button>
        ))}
      </div>
    )
  }

  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={event => {
        event.preventDefault()
        if (value.trim()) onAnswer(value.trim())
      }}
    >
      <input
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={INPUT_PLACEHOLDER}
        className="flex-1 rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm outline-none dark:border-white/15"
      />
      <button
        type="submit"
        className="rounded-md bg-black px-3 py-1 text-white dark:bg-white dark:text-black"
      >
        {SUBMIT_LABEL}
      </button>
    </form>
  )
}
