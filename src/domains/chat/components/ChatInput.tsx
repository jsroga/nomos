'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, StopCircle, User, BookOpen, Command, X, CornerDownLeft } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export interface MentionItem {
    id: string
    name: string
    type: 'character' | 'world_rule' | 'faction'
}

// Simple Chat Input with Cursor-like queue
interface ChatInputProps {
    onSend: (message: string) => void
    onStop?: () => void
    isSending: boolean
    placeholder?: string
    maxLength?: number
    mentions?: MentionItem[]
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSend,
    onStop,
    isSending,
    placeholder = "Type a message...",
    maxLength = 1000,
    mentions = [],
}) => {
    const [input, setInput] = useState('')
    const [showMentions, setShowMentions] = useState(false)
    const [mentionFilter, setMentionFilter] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [pendingQueue, setPendingQueue] = useState<string[]>([])
    const [lastEnterTime, setLastEnterTime] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const filteredMentions = mentions.filter(m =>
        m.name && m.name.toLowerCase().includes(mentionFilter.toLowerCase())
    ).slice(0, 8)

    // Send all queued messages + current input
    const flushAndSend = () => {
        const allMessages = [...pendingQueue]
        if (input.trim()) {
            allMessages.push(input.trim())
        }
        
        if (allMessages.length === 0) return
        
        // Send all as one combined message or separately
        // For now, send them one by one in order
        allMessages.forEach(msg => onSend(msg))
        
        setPendingQueue([])
        setInput('')
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    // Add current input to queue
    const addToQueue = () => {
        if (!input.trim()) return
        setPendingQueue(prev => [...prev, input.trim()])
        setInput('')
        
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    // Remove item from queue
    const removeFromQueue = (index: number) => {
        setPendingQueue(prev => prev.filter((_, i) => i !== index))
    }

    const insertMention = (item: MentionItem) => {
        if (!item?.name) return
        const lastAtIndex = input.lastIndexOf('@')
        const newInput = input.substring(0, lastAtIndex) + '@' + item.name + ' '
        setInput(newInput)
        setShowMentions(false)
        setMentionFilter('')
        textareaRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showMentions && filteredMentions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % filteredMentions.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                insertMention(filteredMentions[selectedIndex])
            } else if (e.key === 'Escape') {
                setShowMentions(false)
            }
            return
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            
            const now = Date.now()
            const timeSinceLastEnter = now - lastEnterTime
            setLastEnterTime(now)
            
            // Double Enter within 400ms = flush and send all
            if (timeSinceLastEnter < 400 && (pendingQueue.length > 0 || input.trim())) {
                flushAndSend()
                return
            }
            
            // If AI is working, add to queue instead of sending
            if (isSending) {
                addToQueue()
            } else {
                // If not sending, just send directly (single message)
                if (input.trim()) {
                    onSend(input.trim())
                    setInput('')
                    if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto'
                    }
                }
            }
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInput(value)

        // Check for @ mention trigger
        const lastWord = value.split(/\s/).pop() || ''

        if (lastWord.startsWith('@')) {
            setShowMentions(true)
            setMentionFilter(lastWord.substring(1))
            setSelectedIndex(0)
        } else {
            setShowMentions(false)
        }
    }

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [input])

    const hasQueue = pendingQueue.length > 0

    return (
        <div className="border-t bg-card relative z-30">
            {/* Queue Bar - Visible when items queued */}
            {hasQueue && (
                <div className="px-4 py-2 border-b border-border/30 bg-muted/20 animate-in slide-in-from-bottom-1 duration-200">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Queued</span>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">({pendingQueue.length})</span>
                        <div className="flex-1" />
                        <span className="text-[10px] text-muted-foreground/50">Double ↵ to send all</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {pendingQueue.map((msg, idx) => (
                            <div
                                key={idx}
                                className="group flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-foreground/80 max-w-[200px]"
                            >
                                <span className="truncate">{msg.length > 30 ? msg.slice(0, 30) + '...' : msg}</span>
                                <button
                                    onClick={() => removeFromQueue(idx)}
                                    className="opacity-50 hover:opacity-100 transition-opacity p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4">
                {/* Mention Popover - Cursor-like */}
                {showMentions && filteredMentions.length > 0 && (
                    <div className="absolute bottom-full left-4 mb-2 w-64 bg-card border border-border shadow-2xl rounded-lg overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            <Command className="w-3 h-3" />
                            <span>Reference Entity</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredMentions.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => insertMention(item)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                                        idx === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground/80"
                                    )}
                                >
                                    <div className="p-1 rounded bg-muted/50">
                                        {item.type === 'character' ? <User className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-xs font-medium truncate">{item.name}</div>
                                        <div className="text-[9px] uppercase tracking-tighter opacity-50">{item.type}</div>
                                    </div>
                                    {idx === selectedIndex && <div className="text-[10px] opacity-50 font-mono">↵</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="relative flex items-end gap-2">
                    <div className="relative flex-1">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isSending ? "Type to queue (Enter), double-Enter to send all..." : placeholder}
                            className={cn(
                                "min-h-[50px] max-h-[200px] resize-none pr-12 py-3 bg-secondary/20 border-border/50 focus:border-primary/40 transition-all font-medium text-base scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent rounded-xl",
                                isSending && "border-dashed border-primary/30"
                            )}
                        />
                        {input.startsWith('/') && (
                            <div className="absolute left-3 top-3 pointer-events-none">
                                <span className="text-primary font-mono text-sm opacity-50">/</span>
                            </div>
                        )}
                    </div>

                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                        {isSending && onStop && (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onStop}
                                className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                                title="Stop generating"
                            >
                                <StopCircle className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        
                        {hasQueue ? (
                            <Button
                                size="icon"
                                onClick={flushAndSend}
                                className="h-8 w-8 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                title="Send all queued messages"
                            >
                                <CornerDownLeft className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                size="icon"
                                onClick={() => {
                                    if (isSending) {
                                        addToQueue()
                                    } else if (input.trim()) {
                                        onSend(input.trim())
                                        setInput('')
                                    }
                                }}
                                disabled={!input.trim()}
                                className={cn(
                                    "h-8 w-8 rounded-full shadow-lg transition-all",
                                    isSending
                                        ? "bg-muted/50 text-foreground border border-border/50 hover:bg-muted"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                                )}
                                title={isSending ? "Add to queue" : "Send message"}
                            >
                                {isSending ? <Command className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-2 px-1">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">
                            <span className="opacity-50">@</span>
                            <span>Mention</span>
                        </div>
                        {isSending && (
                            <div className="flex items-center gap-1.5 text-[10px] text-primary/70 font-medium">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span>Processing</span>
                            </div>
                        )}
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 font-mono">
                        {input.length}/{maxLength}
                    </div>
                </div>
            </div>
        </div>
    )
}
