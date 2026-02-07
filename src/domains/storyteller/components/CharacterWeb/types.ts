/**
 * Types for CharacterWeb component
 */

import { Node, Edge } from '@xyflow/react'

export type RelationshipType =
  | 'ally'
  | 'enemy'
  | 'rival'
  | 'mentor'
  | 'student'
  | 'lover'
  | 'family'
  | 'member_of'
  | 'leader_of'
  | 'associated'
  | 'related'

export interface CharacterNodeData {
  [k: string]: unknown
  name: string
  role?: string
  avatarUrl?: string
  description?: string
  type: 'character' | 'faction' | 'place' | 'event' | 'rule'
  // Metrics for visualization
  stressLevel?: number // 0-100
  transformationProgress?: number // 0-100
  // For highlighting
  isHighlighted?: boolean
  isCentral?: boolean
  /** Entity is the focused/navigated-to entity (cyan ring) */
  isSelected?: boolean
}

export interface RelationshipEdgeData {
  [k: string]: unknown
  relationshipType: RelationshipType
  strength: number // 0-1
  trust?: number // -1 to 1
  dynamic?: string
  history?: Array<{
    beatId: string
    change: string
  }>
}

// Node type for React Flow
export type CharacterWebNode = Node<CharacterNodeData>

// Edge type for React Flow
export type CharacterWebEdge = Edge<RelationshipEdgeData>

// Edge styling based on relationship type
export const RELATIONSHIP_STYLES: Record<RelationshipType, {
  color: string
  strokeStyle: string
  strokeWidth: number
  animated: boolean
}> = {
  ally: { color: '#22c55e', strokeStyle: 'solid', strokeWidth: 2, animated: false },
  enemy: { color: '#ef4444', strokeStyle: 'dashed', strokeWidth: 2, animated: true },
  rival: { color: '#f97316', strokeStyle: 'dotted', strokeWidth: 2, animated: false },
  mentor: { color: '#a855f7', strokeStyle: 'solid', strokeWidth: 3, animated: false },
  student: { color: '#a855f7', strokeStyle: 'solid', strokeWidth: 1, animated: false },
  lover: { color: '#ec4899', strokeStyle: 'solid', strokeWidth: 3, animated: true },
  family: { color: '#3b82f6', strokeStyle: 'solid', strokeWidth: 2, animated: false },
  member_of: { color: '#6366f1', strokeStyle: 'dashed', strokeWidth: 1, animated: false },
  leader_of: { color: '#6366f1', strokeStyle: 'solid', strokeWidth: 3, animated: false },
  associated: { color: '#94a3b8', strokeStyle: 'dotted', strokeWidth: 1, animated: false },
  related: { color: '#64748b', strokeStyle: 'dotted', strokeWidth: 1, animated: false },
}

// API response types
export interface RelationshipMatrixResponse {
  nodes: Array<{
    id: string
    name: string
    type: 'character' | 'faction' | 'place' | 'event' | 'rule'
    description?: string
    metadata: Record<string, any>
  }>
  edges: Array<{
    source: string
    target: string
    weight: number
    type: string
    label?: string
  }>
  centralCharacter?: string
}
