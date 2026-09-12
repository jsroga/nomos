// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/Tooltip'
import { FixInconsistenciesReview } from '../FixInconsistenciesReview'
import {
  ContinuityAffectedKind,
  ContinuityFindingSeverity,
  ContinuityFindingType,
} from '@/domains/storyteller/ai/workflows/fix-inconsistencies-schema'

enum ReviewChipFixture {
  Name = 'Death Debt',
  Quote = '[Death Debt][item-death-debt] sits on the altar.',
  Why = 'The relic [Death Debt][item-death-debt] cannot be in two places.',
  ProjectId = 'project-review',
  FindingId = 'finding-1',
  FieldPath = 'world.relics',
}

describe('FixInconsistenciesReview entity chips', () => {
  let host: HTMLElement
  let root: Root | undefined

  beforeAll(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    host?.remove()
  })

  it('renders quote references as chips, not raw bracket ids', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    await act(async () => {
      root?.render(
        <QueryClientProvider client={client}>
          <TooltipProvider>
            <FixInconsistenciesReview
            projectId={ReviewChipFixture.ProjectId}
            findings={[
              {
                id: ReviewChipFixture.FindingId,
                type: ContinuityFindingType.WorldRule,
                severity: ContinuityFindingSeverity.Major,
                quote: ReviewChipFixture.Quote,
                why: ReviewChipFixture.Why,
                affected: [
                  {
                    kind: ContinuityAffectedKind.WorldRule,
                    id: ReviewChipFixture.FindingId,
                    fieldPath: ReviewChipFixture.FieldPath,
                    name: ReviewChipFixture.Name,
                  },
                ],
                patchable: true,
              },
            ]}
            fixes={[]}
            skipped={[]}
          />
          </TooltipProvider>
        </QueryClientProvider>,
      )
    })
    expect(host.textContent).toContain(ReviewChipFixture.Name)
    expect(host.textContent).not.toContain('[item-death-debt]')
    expect(host.querySelector('button')?.textContent).toContain(ReviewChipFixture.Name)
  })
})
