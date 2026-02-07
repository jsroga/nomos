
'use client'

import React from 'react'

// ==========================================
// EMOTIONAL TRAJECTORY VISUALIZATION (Phase 10.20)
// ==========================================
// Dashboard component for visualizing Valence/Arousal over time.
// Uses recharts for the line chart.

export interface TrajectoryPoint {
    turn: number
    valence: number  // -1 to +1
    arousal: number  // 0 to 1
    label?: string
}

export interface EmotionalTrajectoryProps {
    data: TrajectoryPoint[]
    title?: string
}

/**
 * Renders an Emotional Trajectory chart.
 * X-axis: Dialogue turns
 * Y-axis: Valence (red/green gradient) and Arousal (line thickness)
 */
export function EmotionalTrajectoryChart({ data, title = 'Emotional Trajectory' }: EmotionalTrajectoryProps) {
    if (data.length === 0) {
        return (
            <div className="p-4 bg-zinc-900 rounded-lg text-center text-zinc-500">
                No trajectory data available
            </div>
        )
    }

    // Calculate quadrant distribution
    const quadrants = {
        highArousalNegative: 0,
        highArousalPositive: 0,
        lowArousalNegative: 0,
        lowArousalPositive: 0
    }

    for (const point of data) {
        if (point.arousal > 0.5 && point.valence < 0) quadrants.highArousalNegative++
        else if (point.arousal > 0.5 && point.valence > 0) quadrants.highArousalPositive++
        else if (point.arousal <= 0.5 && point.valence < 0) quadrants.lowArousalNegative++
        else quadrants.lowArousalPositive++
    }

    return (
        <div className="p-6 bg-zinc-900 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>

            {/* Simple SVG visualization */}
            <svg viewBox="0 0 400 200" className="w-full h-48 bg-zinc-800 rounded">
                {/* Axes */}
                <line x1="200" y1="0" x2="200" y2="200" stroke="#444" strokeWidth="1" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#444" strokeWidth="1" />

                {/* Labels */}
                <text x="380" y="95" fontSize="10" fill="#888">Positive</text>
                <text x="5" y="95" fontSize="10" fill="#888">Negative</text>
                <text x="195" y="15" fontSize="10" fill="#888">High</text>
                <text x="195" y="195" fontSize="10" fill="#888">Low</text>

                {/* Data points */}
                {data.map((point, i) => {
                    const x = 200 + (point.valence * 180)
                    const y = 100 - (point.arousal * 80) - 10 + (1 - point.arousal) * 80
                    const color = point.valence > 0 ? '#22c55e' : '#ef4444'
                    const size = 4 + point.arousal * 6

                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r={size}
                            fill={color}
                            opacity={0.7 + i * 0.03}
                        />
                    )
                })}

                {/* Trajectory line */}
                {data.length > 1 && (
                    <polyline
                        points={data.map((p, i) => {
                            const x = 200 + (p.valence * 180)
                            const y = 100 - (p.arousal * 80) - 10 + (1 - p.arousal) * 80
                            return `${x},${y}`
                        }).join(' ')}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2"
                        opacity="0.5"
                    />
                )}
            </svg>

            {/* Quadrant Summary */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div className="bg-red-900/20 p-2 rounded text-red-400">
                    High Arousal + Negative: {quadrants.highArousalNegative}
                </div>
                <div className="bg-green-900/20 p-2 rounded text-green-400">
                    High Arousal + Positive: {quadrants.highArousalPositive}
                </div>
                <div className="bg-orange-900/20 p-2 rounded text-orange-400">
                    Low Arousal + Negative: {quadrants.lowArousalNegative}
                </div>
                <div className="bg-blue-900/20 p-2 rounded text-blue-400">
                    Low Arousal + Positive: {quadrants.lowArousalPositive}
                </div>
            </div>
        </div>
    )
}
