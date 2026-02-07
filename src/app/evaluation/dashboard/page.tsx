'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import type { MultiVariantReport, VariantReport } from '@/evaluation/types'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Mock Data for Skeleton (until we load real JSON)
const MOCK_DATA = {
    variants: [
        { name: 'Vanilla', magicScore: 0.45, consistency: 0.8, orchestration: 0.9 },
        { name: 'Pro-CoT', magicScore: 0.75, consistency: 0.85, orchestration: 0.95 },
        { name: 'Pro-HighTemp', magicScore: 0.82, consistency: 0.65, orchestration: 0.8 },
    ]
}

export default function DashboardPage() {
    const [data, setData] = useState<MultiVariantReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedVariant, setSelectedVariant] = useState<VariantReport | null>(null)
    const [detailScenario, setDetailScenario] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/evaluation/latest')
            .then(res => res.json())
            .then(data => { setData(data); setLoading(false) })
            .catch(err => { console.warn('Failed to load data', err); setLoading(false) })
    }, [])

    // Process data for charts
    const displayData = data ? data.variants.map(v => ({
        name: v.name.split('(')[0].trim(), // Shorten name
        fullName: v.name,
        magicScore: v.overallMetrics.magicScore * 100,
        consistency: v.overallMetrics.consistency * 100,
        orchestration: v.overallMetrics.orchestration * 100,
        isWinner: v.name.includes('Architect') || v.overallMetrics.magicScore > 0.8 // Visual logic
    })) : []

    const winner = displayData.find(d => d.isWinner)

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Magic Formula Data...</div>

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-7xl">
            <header className="flex justify-between items-center border-b pb-4">
                <div>
                    <h1 className="text-3xl font-mono font-bold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                        EVALUATION DASHBOARD
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Multi-Variant Analysis • {data?.variants.length || 0} Variants • {data?.scenarios.length || 0} Scenarios
                    </p>
                </div>
                {winner && (
                    <Badge variant="outline" className="text-lg px-4 py-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-500 gap-2">
                        👑 Current Leader: {winner.fullName}
                    </Badge>
                )}
            </header>

            <Tabs defaultValue="unit" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="unit">Unit Tests (80%)</TabsTrigger>
                    <TabsTrigger value="e2e">E2E Simulation</TabsTrigger>
                </TabsList>

                {/* UNIT TESTS TAB */}
                <TabsContent value="unit" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CHART 1 */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle>Performance by Strategy</CardTitle>
                                <CardDescription>Comparing Magic Score vs Consistency</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={displayData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--popover))',
                                                borderColor: 'hsl(var(--border))',
                                                color: 'hsl(var(--popover-foreground))',
                                                borderRadius: 'var(--radius)'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="magicScore" name="Magic" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={20} />
                                        <Bar dataKey="consistency" name="Consistency" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* CHART 2 (Radar) */}
                        <Card className="md:col-span-1">
                            <CardHeader>
                                <CardTitle>Skill Balance Shape</CardTitle>
                                <CardDescription>Winner Profile vs Baseline</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                        // Mock radar data mapping
                                        { subject: 'Magic', A: 40, Winner: 85, fullMark: 100 },
                                        { subject: 'Consistency', A: 90, Winner: 85, fullMark: 100 },
                                        { subject: 'Orchestration', A: 95, Winner: 90, fullMark: 100 },
                                        { subject: 'Latency', A: 80, Winner: 60, fullMark: 100 }, // Inverse score
                                        { subject: 'Cost', A: 90, Winner: 80, fullMark: 100 },
                                    ]}>
                                        <PolarGrid stroke="hsl(var(--border))" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Baseline (A)" dataKey="A" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted))" fillOpacity={0.2} />
                                        <Radar name="Winner" dataKey="Winner" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.4} />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* HEATMAP */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Breakdown</CardTitle>
                            <CardDescription>Click any row to inspect conversation logs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 border-b">
                                            <th className="text-left py-3 px-4 font-medium">Variant</th>
                                            <th className="text-left py-3 px-4 font-medium">Strategy</th>
                                            <th className="text-left py-3 px-4 font-medium">Overall</th>
                                            <th className="text-left py-3 px-4 font-medium">Sci-Fi</th>
                                            <th className="text-left py-3 px-4 font-medium">Fantasy</th>
                                            <th className="text-left py-3 px-4 font-medium">Thriller</th>
                                            <th className="text-left py-3 px-4 font-medium">Edge</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.variants.map((v) => (
                                            <tr
                                                key={v.name}
                                                className={`
                                                    border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer group
                                                    ${v.name.includes('Architect') ? 'bg-yellow-500/5 hover:bg-yellow-500/10' : ''}
                                                `}
                                                onClick={() => setSelectedVariant(v)}
                                            >
                                                <td className="py-3 px-4 font-medium flex items-center gap-2">
                                                    {v.name}
                                                    {v.name.includes('Architect') && <span className="text-xs">👑</span>}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground text-xs">{v.config.strategy as string}</td>
                                                <td className="py-3 px-4 font-bold" style={{ color: getScoreColor(v.overallMetrics.magicScore) }}>
                                                    {(v.overallMetrics.magicScore * 100).toFixed(0)}%
                                                </td>
                                                {['sci-fi', 'fantasy', 'thriller', 'edge'].map(s => (
                                                    <td key={s} className="py-3 px-4 text-muted-foreground group-hover:text-foreground transition-colors"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedVariant(v); setDetailScenario(s); }}>
                                                        <span className={`px-2 py-1 rounded ${getScoreBg(v.scenarioMetrics[s]?.magicScore)}`}>
                                                            {(v.scenarioMetrics[s]?.magicScore * 100).toFixed(0)}%
                                                        </span>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* E2E TAB */}
                <TabsContent value="e2e">
                    {data?.e2eVariants && data.e2eVariants.length > 0 ? (
                        <E2EView variants={data.e2eVariants} />
                    ) : (
                        <Card className="border-dashed">
                            <CardHeader className="text-center py-12">
                                <CardTitle className="text-2xl">No E2E Data Found</CardTitle>
                                <CardDescription>Run `npm run eval:sim` to generate multi-session reports.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* DETAIL MODAL */}
            <Dialog open={!!selectedVariant} onOpenChange={(open) => !open && setSelectedVariant(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            {selectedVariant?.name}
                            {detailScenario && <Badge variant="secondary" className="uppercase">{detailScenario}</Badge>}
                        </DialogTitle>
                        <DialogDescription>
                            Strategy: <code className="bg-muted px-1 rounded">{selectedVariant?.config.strategy as string}</code>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* METRICS ROW */}
                        <div className="grid grid-cols-4 gap-4">
                            <MetricCard label="Magic Score" value={selectedVariant?.overallMetrics.magicScore} />
                            <MetricCard label="Consistency" value={selectedVariant?.overallMetrics.consistency} />
                            <MetricCard label="Orchestration" value={selectedVariant?.overallMetrics.orchestration} />
                            <MetricCard label="Latency" value={selectedVariant?.overallMetrics.latencyMs} unit="ms" />
                        </div>

                        {/* CONVERSATION LOGS */}
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>Conversation Logs</span>
                                <Badge variant="outline" className="text-xs font-normal">{selectedVariant?.exampleLogs?.length || 0} entries</Badge>
                            </h3>
                            <div className="space-y-4">
                                {selectedVariant?.exampleLogs
                                    ?.filter(l => !detailScenario || l.scenario.toLowerCase() === detailScenario?.toLowerCase())
                                    .map((log) => (
                                        <div key={log.id} className="border rounded-lg overflow-hidden text-sm">
                                            <div className="bg-muted/30 p-2 flex justify-between items-center border-b px-4">
                                                <span className="font-mono text-xs text-muted-foreground">{log.id}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getScoreBg(log.score)}`}>
                                                    Score: {(log.score * 100).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="p-4 space-y-3 bg-card">
                                                <div>
                                                    <div className="text-xs uppercase text-muted-foreground font-semibold mb-1">User Input</div>
                                                    <div className="bg-muted/10 p-2 rounded text-foreground/90">{log.input}</div>
                                                </div>

                                                {/* CONTEXT INSPECTION UI */}
                                                {(log as any).context && Object.keys((log as any).context).length > 0 && (
                                                    <div>
                                                        <div className="text-xs uppercase text-indigo-500 font-semibold mb-1 flex items-center gap-2">
                                                            🔍 Context Inspector
                                                            <Badge variant="secondary" className="text-[10px] h-4">Hidden State</Badge>
                                                        </div>
                                                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded border border-indigo-100 dark:border-indigo-900/50">
                                                            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[200px]">
                                                                {JSON.stringify((log as any).context, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="text-xs uppercase text-muted-foreground font-semibold mb-1">Agent Response</div>
                                                    <div className="bg-muted/10 p-2 rounded text-foreground/90 border-l-2 border-primary/20 pl-4">
                                                        {log.output}
                                                    </div>
                                                </div>
                                                {log.reasoning && (
                                                    <div className="mt-2 pt-2 border-t border-dashed">
                                                        <div className="text-xs text-muted-foreground">Analysis: {JSON.stringify(log.reasoning)}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {selectedVariant?.exampleLogs?.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">No logs captured for this variant.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function E2EView({ variants }: { variants: any[] }) {
    const [selectedSessionId, setSelectedSessionId] = useState<string>(variants[0]?.id || '')
    const session = variants.find(v => v.id === selectedSessionId) || variants[0]

    // Prepare chart data for Sentiment Sparkline
    const sentimentData = session.metrics?.sentimentCurve?.map((val: number, i: number) => ({
        index: i,
        value: val * 100
    })) || []

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[800px]">
            {/* LEFT SIDEBAR: SESSION LIST */}
            <Card className="lg:col-span-1 flex flex-col overflow-hidden h-full">
                <CardHeader className="bg-muted/20 border-b pb-4">
                    <CardTitle className="text-lg">Sessions</CardTitle>
                    <CardDescription>Select a scenario run</CardDescription>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {variants.map(v => (
                        <button
                            key={v.id}
                            onClick={() => setSelectedSessionId(v.id)}
                            className={`
                                w-full text-left p-3 rounded-md text-sm transition-all border
                                ${selectedSessionId === v.id
                                    ? 'bg-primary/10 border-primary text-primary font-medium'
                                    : 'hover:bg-muted border-transparent text-muted-foreground'}
                            `}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span>{v.persona}</span>
                                <Badge variant={v.metrics?.userSatisfaction > 0.8 ? 'outline' : 'destructive'} className="text-[10px] h-5 px-1 py-0">
                                    {(v.metrics?.userSatisfaction * 100).toFixed(0)}% CSAT
                                </Badge>
                            </div>
                            <div className="text-xs opacity-70 truncate">{v.description}</div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* CENTER: MAIN CONTENT */}
            <div className="lg:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
                {/* TOP METRICS ROW */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">User Sentiment Flow</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[80px] p-0 px-4 pb-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <CommonLineChart data={sentimentData} dataKey="value" stroke="hsl(var(--chart-2))" />
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <MetricCard label="Stability Score" value={session.metrics?.phaseStability} />
                    <MetricCard label="Turns to Writing" value={session.metrics?.turnsToWriting} unit="" />
                </div>

                {/* CHAT TRANSCRIPT */}
                <Card className="flex-1 flex flex-col overflow-hidden border-2 border-primary/10 shadow-lg">
                    <CardHeader className="py-4 border-b bg-muted/10">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    📜 Transcript: {session.persona}
                                    <Badge variant="secondary" className="font-normal text-xs">{session.description}</Badge>
                                </CardTitle>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                                ID: {session.id}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-0 bg-background">
                        <div className="flex flex-col gap-4 p-6">
                            {session.transcript?.map((msg: any, i: number) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`
                                        max-w-[85%] rounded-2xl p-5 text-sm shadow-sm border
                                        ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-none border-primary'
                                            : 'bg-muted/50 rounded-bl-none border-border'}
                                    `}>
                                        <div className="flex justify-between items-center mb-2 opacity-70 text-[10px] uppercase tracking-widest font-semibold">
                                            <span className="flex items-center gap-1">
                                                {msg.role === 'user' ? '👤 User' : '🤖 Storyteller'}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded-sm bg-black/10 dark:bg-white/10`}>{msg.phase}</span>
                                        </div>
                                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                                            {msg.content}
                                        </div>
                                        <div className="mt-2 text-[10px] opacity-40 text-right font-mono">
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                            {msg.meta?.latencyMs && ` • ${msg.meta.latencyMs}ms`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Helper for Line Chart (Sparkline)
function CommonLineChart({ data, dataKey, stroke }: { data: any[], dataKey: string, stroke: string }) {
    const { LineChart, Line } = require('recharts') // Lazy load components
    return (
        <LineChart data={data}>
            <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} dot={false} />
        </LineChart>
    )
}



function MetricCard({ label, value, unit = '%' }: { label: string, value?: number, unit?: string }) {
    if (value === undefined) return null
    const displayValue = unit === '%' ? (value * 100).toFixed(0) : value.toFixed(0)
    return (
        <div className="border rounded p-4 text-center bg-card shadow-sm">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
            <div className="text-2xl font-bold font-mono">
                {displayValue}<span className="text-sm text-muted-foreground font-normal ml-0.5">{unit}</span>
            </div>
        </div>
    )
}

function getScoreBg(score?: number): string {
    if (score === undefined) return ''
    if (score >= 0.8) return 'bg-green-500/10 text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    return 'bg-red-500/10 text-red-600 dark:text-red-400'
}
function getScoreColor(score: number): string {
    if (score >= 0.8) return 'hsl(142, 76%, 36%)' // Green
    if (score >= 0.6) return 'hsl(45, 93%, 47%)' // Yellow/Orange
    return 'hsl(0, 84%, 60%)' // Red
}
