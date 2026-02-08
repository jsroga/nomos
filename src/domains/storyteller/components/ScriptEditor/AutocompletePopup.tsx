/**
 * Autocomplete Popup (S2)
 *
 * Lightweight popup component for ScriptEditor autocomplete.
 * Keyboard navigation: Arrow Up/Down, Enter/Tab to accept, Escape to dismiss.
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { CompletionItem } from './autocomplete-engine'

interface AutocompletePopupProps {
    items: CompletionItem[]
    selectedIndex: number
    position: { x: number; y: number }
    onSelect: (item: CompletionItem) => void
    onNavigate: (direction: 'up' | 'down') => void
    onDismiss: () => void
}

const KIND_ICONS: Record<string, string> = {
    character: 'C',
    location: 'L',
    transition: 'T',
    parenthetical: 'P',
    ai: 'AI',
}

export default function AutocompletePopup({
    items,
    selectedIndex,
    position,
    onSelect,
    onNavigate,
    onDismiss,
}: AutocompletePopupProps) {
    const listRef = useRef<HTMLDivElement>(null)
    const maxVisible = 8

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return
        const selected = listRef.current.children[selectedIndex] as HTMLElement
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex])

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    onNavigate('down')
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    onNavigate('up')
                    break
                case 'Enter':
                case 'Tab':
                    e.preventDefault()
                    if (items[selectedIndex]) {
                        onSelect(items[selectedIndex])
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    onDismiss()
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [items, selectedIndex, onSelect, onNavigate, onDismiss])

    if (items.length === 0) return null

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y + 20, // Below cursor
                zIndex: 100,
                minWidth: 200,
                maxWidth: 400,
                maxHeight: maxVisible * 32,
                overflowY: 'auto',
                backgroundColor: '#1e1e1e',
                border: '1px solid #3e3e3e',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                fontFamily: '"Courier Prime", "Courier New", monospace',
                fontSize: 13,
            }}
            ref={listRef}
        >
            {items.map((item, i) => (
                <div
                    key={`${item.kind}-${item.label}-${i}`}
                    onClick={() => onSelect(item)}
                    style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: i === selectedIndex ? '#264f78' : 'transparent',
                        color: i === selectedIndex ? '#ffffff' : '#cccccc',
                    }}
                >
                    <span
                        style={{
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 'bold',
                            borderRadius: 3,
                            backgroundColor: '#333',
                            color: '#888',
                            flexShrink: 0,
                        }}
                    >
                        {KIND_ICONS[item.kind] || '?'}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                    </span>
                    {item.detail && (
                        <span style={{ color: '#666', fontSize: 11, flexShrink: 0 }}>
                            {item.detail}
                        </span>
                    )}
                </div>
            ))}
        </div>
    )
}
