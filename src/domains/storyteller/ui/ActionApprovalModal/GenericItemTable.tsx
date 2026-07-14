import React from 'react'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { ActionChange } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-types'
import {
  HIDDEN_TABLE_FIELD_KEYS,
  TABLE_COLUMN_PRIORITY_INDEX,
} from '@/domains/storyteller/ui/ActionApprovalModal/constants/action-approval-display'
import { ChangeTypeBadge, formatFieldName } from '@/domains/storyteller/ui/ActionApprovalModal/action-approval-helpers'

export const GenericItemTable: React.FC<{ changes: ActionChange[] }> = ({ changes }) => {
  if (changes.length === 0) return null

  const allFields = new Set<string>()
  changes.forEach(change => {
    const data = change.after || change.before
    if (typeof data === 'object' && data !== null) {
      Object.keys(data).forEach(key => {
        if (!HIDDEN_TABLE_FIELD_KEYS.has(key)) {
          allFields.add(key)
        }
      })
    }
  })

  const sortedColumns = Array.from(allFields).sort((a, b) => {
    const idxA = TABLE_COLUMN_PRIORITY_INDEX.get(a) ?? -1
    const idxB = TABLE_COLUMN_PRIORITY_INDEX.get(b) ?? -1
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="overflow-x-auto rounded-md border border-border/40">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium w-10">Type</th>
            {sortedColumns.map(col => (
              <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
                {formatFieldName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/20">
          {changes.map((change, idx) => {
            const data = recordFromJson(change.after ?? change.before)
            return (
              <tr key={idx} className="bg-card/50 hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 align-top">
                  <ChangeTypeBadge type={change.changeType} />
                </td>
                {sortedColumns.map(col => (
                  <td
                    key={col}
                    className="px-3 py-2 max-w-[300px] truncate align-top"
                    title={String(data[col] || '')}
                  >
                    {data[col] ? String(data[col]) : <span className="text-muted-foreground/30">-</span>}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
