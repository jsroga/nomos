'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface UpscaleReviewDialogProps {
    open: boolean
    onClose: () => void
    tileX: number
    tileY: number
    upscaledUrl: string
    originalUrl: string
}

export const UpscaleReviewDialog: React.FC<UpscaleReviewDialogProps> = ({
    open,
    onClose,
    tileX,
    tileY,
    upscaledUrl,
    originalUrl
}) => {
    const [isAccepting, setIsAccepting] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)
    const acceptUpscale = useWorldStore(state => state.acceptUpscale)
    const rejectUpscale = useWorldStore(state => state.rejectUpscale)

    const handleAccept = async () => {
        setIsAccepting(true)
        try {
            await acceptUpscale(tileX, tileY)
            toast.success('Upscale accepted!')
            onClose()
        } catch (error: any) {
            toast.error(`Failed to accept: ${error.message}`)
        } finally {
            setIsAccepting(false)
        }
    }

    const handleReject = () => {
        setIsRejecting(true)
        try {
            rejectUpscale(tileX, tileY)
            toast('Upscale rejected - keeping original', { icon: 'ℹ️' })
            onClose()
        } finally {
            setIsRejecting(false)
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleAccept()
            } else if (e.key === 'Escape') {
                e.preventDefault()
                handleReject()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open])

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>Review Upscaled Tile ({tileX}, {tileY})</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Original */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground text-center">Original</p>
                            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                                <Image
                                    src={originalUrl}
                                    alt="Original tile"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </div>

                        {/* Upscaled */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-primary text-center">Upscaled</p>
                            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border-2 border-primary">
                                <Image
                                    src={upscaledUrl}
                                    alt="Upscaled tile"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-xs text-muted-foreground">
                            <kbd className="px-2 py-1 bg-muted rounded border border-border">Enter</kbd> to accept •{' '}
                            <kbd className="px-2 py-1 bg-muted rounded border border-border">Esc</kbd> to reject
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleReject}
                                disabled={isAccepting || isRejecting}
                                className="gap-2"
                            >
                                {isRejecting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <X size={16} />
                                )}
                                Reject (Keep Original)
                            </Button>

                            <Button
                                onClick={handleAccept}
                                disabled={isAccepting || isRejecting}
                                className="gap-2"
                            >
                                {isAccepting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                Accept Upscale
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
