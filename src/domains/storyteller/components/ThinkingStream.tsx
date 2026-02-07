import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronUp, ChevronDown, CheckCircle, Circle } from 'lucide-react'
import { PlanItem } from '../types'

interface ThinkingStreamProps {
  plannerThinking?: string
  plan?: PlanItem[]
  isThinking?: boolean
}

export const ThinkingStream: React.FC<ThinkingStreamProps> = ({
  plannerThinking,
  plan = [],
  isThinking = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-expand if there is a plan active and things are happening
  useEffect(() => {
    if (plan.length > 0 && plan.some(p => p.status === 'in_progress')) {
      // Maybe not auto expand to avoid annoyance, but keep collapsed state clean
    }
  }, [plan])

  if (!plan.length && !plannerThinking) return null

  const activeTask = plan.find(p => p.status === 'in_progress')

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <div className="pointer-events-auto">
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header / Status Bar */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              {isThinking ? (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 animate-pulse" />
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin relative z-10" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              )}

              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-200">
                  {activeTask
                    ? `Working: ${activeTask.description}`
                    : isThinking
                      ? 'Thinking...'
                      : 'Plan Complete'}
                </span>
                {activeTask && (
                  <span className="text-xs text-neutral-500">
                    Agent: {activeTask.assignedAgent}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 font-mono">
                {plan.filter(p => p.status === 'complete').length}/{plan.length}
              </span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-neutral-500" />
              )}
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/5"
              >
                <div className="max-h-64 overflow-y-auto p-4 space-y-4">
                  {/* Planner Thinking Stream */}
                  {plannerThinking && (
                    <div className="bg-black/20 rounded-lg p-3 font-mono text-xs text-neutral-400 leading-relaxed whitespace-pre-wrap">
                      {plannerThinking}
                    </div>
                  )}

                  {/* Plan List */}
                  <div className="space-y-2">
                    {plan.map(task => (
                      <div key={task.id} className="flex items-start gap-3 text-sm group">
                        <div className="mt-0.5">
                          {task.status === 'complete' && (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          )}
                          {task.status === 'in_progress' && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          )}
                          {task.status === 'pending' && (
                            <Circle className="w-4 h-4 text-neutral-700 group-hover:text-neutral-500 transition-colors" />
                          )}
                          {task.status === 'failed' && (
                            <div className="w-4 h-4 rounded-full border border-red-500/50 text-red-500 flex items-center justify-center text-[10px]">
                              !
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex-1 ${task.status === 'complete' ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}
                        >
                          {task.description}
                          <div className="text-[10px] text-neutral-600 font-mono mt-0.5">
                            {task.assignedAgent}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
