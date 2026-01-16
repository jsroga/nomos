'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useGameEntities } from '@/hooks/useGameEntities'
import {
  Users,
  MapPin,
  Gamepad2,
  Shield,
  Package,
  Target,
  Sparkles,
  Clock,
  TrendingUp,
  ArrowRight,
  Grid3x3,
  FileText,
  Layers,
  Search,
  BookOpen,
  Tv,
  Map,
  Home,
  Brush,
  Layout,
  Pencil,
  Activity,
} from 'lucide-react'
import { EntityPicker } from './EntityPicker'

interface GameHubDashboardProps {
  projectId: string
}

export function GameHubDashboard({ projectId }: GameHubDashboardProps) {
  const { entities, loading } = useGameEntities({ projectId, autoFetch: true })
  const [searchQuery, setSearchQuery] = useState('')

  // Stats by entity type
  const stats = {
    characters: entities.filter(e => e.entityType === 'character').length,
    locations: entities.filter(e => e.entityType === 'location').length,
    mechanics: entities.filter(e => e.entityType === 'mechanic').length,
    factions: entities.filter(e => e.entityType === 'faction').length,
    items: entities.filter(e => e.entityType === 'item').length,
    quests: entities.filter(e => e.entityType === 'quest').length,
  }

  // Stats by domain
  const domainStats = {
    storyteller: entities.filter(e => e.usedInDomains.includes('storyteller')).length,
    'loop-creator': entities.filter(e => e.usedInDomains.includes('loop-creator')).length,
    'interior-designer': entities.filter(e => e.usedInDomains.includes('interior-designer')).length,
    'world-building': entities.filter(e => e.usedInDomains.includes('world-building')).length,
  }

  const totalEntities = entities.length

  // Domains/tools available
  const domains = [
    {
      id: 'storyteller',
      name: 'Storyteller',
      description: 'Write scripts, develop characters, build story world',
      icon: <Tv className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
      href: `/app/${projectId}/storyteller`,
      stats: `${domainStats.storyteller} entities`,
    },
    {
      id: 'loop-creator',
      name: 'Loop Creator',
      description: 'Design game loops, mechanics, and progression',
      icon: <Gamepad2 className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      href: `/app/${projectId}/loop-creator`,
      stats: `${domainStats['loop-creator']} entities`,
    },
    {
      id: 'world-gen',
      name: 'World Builder',
      description: 'Generate tile maps and world layouts',
      icon: <Map className="w-5 h-5" />,
      color: 'from-green-500 to-emerald-500',
      href: `/app/${projectId}/world-gen`,
      stats: `${domainStats['world-building']} entities`,
    },
    {
      id: 'interior-design',
      name: 'Interior Designer',
      description: 'Build 3D interior spaces and levels',
      icon: <Home className="w-5 h-5" />,
      color: 'from-orange-500 to-red-500',
      href: `/app/${projectId}/interior-design`,
      stats: `${domainStats['interior-designer']} entities`,
    },
    {
      id: 'asset-exporter',
      name: 'Asset Exporter',
      description: 'Convert 2D assets to 3D models',
      icon: <Brush className="w-5 h-5" />,
      color: 'from-yellow-500 to-amber-500',
      href: `/app/${projectId}/asset-exporter`,
      stats: 'Export tools',
    },
    {
      id: 'deduction-puzzle',
      name: 'Puzzle Designer',
      description: 'Create deduction puzzles and logic challenges',
      icon: <Target className="w-5 h-5" />,
      color: 'from-indigo-500 to-purple-500',
      href: `/app/${projectId}/deduction-puzzle`,
      stats: 'Coming soon',
    },
  ]

  // Recent activity (mock for now - would come from actual activity log)
  const recentActivity = entities
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  // Filter entities for search
  const filteredEntities = searchQuery
    ? entities.filter(
        e =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
                <Layers className="w-8 h-8 text-purple-400" />
                Game Development Hub
              </h1>
              <p className="text-gray-400 mt-1">Your Swiss Army knife for game creation</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Project ID:</span>
              <code className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400 font-mono">
                {projectId.slice(0, 8)}...
              </code>
            </div>
          </div>

          {/* Global Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              {
                icon: <Users className="w-4 h-4" />,
                label: 'Characters',
                count: stats.characters,
                color: 'text-blue-400',
              },
              {
                icon: <MapPin className="w-4 h-4" />,
                label: 'Locations',
                count: stats.locations,
                color: 'text-green-400',
              },
              {
                icon: <Gamepad2 className="w-4 h-4" />,
                label: 'Mechanics',
                count: stats.mechanics,
                color: 'text-purple-400',
              },
              {
                icon: <Shield className="w-4 h-4" />,
                label: 'Factions',
                count: stats.factions,
                color: 'text-red-400',
              },
              {
                icon: <Package className="w-4 h-4" />,
                label: 'Items',
                count: stats.items,
                color: 'text-yellow-400',
              },
              {
                icon: <Target className="w-4 h-4" />,
                label: 'Quests',
                count: stats.quests,
                color: 'text-orange-400',
              },
            ].map(stat => (
              <div
                key={stat.label}
                className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4"
              >
                <div className={`${stat.color} mb-1`}>{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-100">{stat.count}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tools/Domains Grid */}
            <section>
              <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-purple-400" />
                Your Toolbox
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {domains.map(domain => (
                  <Link
                    key={domain.id}
                    href={domain.href}
                    className="group relative bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/60 hover:border-gray-600 transition-all overflow-hidden"
                  >
                    {/* Gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`p-3 rounded-lg bg-gradient-to-br ${domain.color} text-white`}
                        >
                          {domain.icon}
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-100 mb-1">{domain.name}</h3>
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {domain.description}
                      </p>
                      <div className="text-xs text-gray-500">{domain.stats}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Cross-Domain Search */}
            <section>
              <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-400" />
                Search Everywhere
              </h2>
              <EntityPicker
                projectId={projectId}
                onSelectEntity={entity => {
                  // Navigate to the entity's source domain
                  const domainMap: Record<string, string> = {
                    storyteller: `/app/${projectId}/storyteller`,
                    'loop-creator': `/app/${projectId}/loop-creator`,
                    'interior-designer': `/app/${projectId}/interior-design`,
                    'world-building': `/app/${projectId}/world-gen`,
                  }
                  const url = domainMap[entity.sourceDomain]
                  if (url) window.location.href = url
                }}
                placeholder="Search characters, locations, mechanics across all tools..."
              />
            </section>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <section className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Activity
              </h2>
              {loading && <p className="text-sm text-gray-500">Loading...</p>}
              {!loading && recentActivity.length === 0 && (
                <p className="text-sm text-gray-500">No activity yet. Start creating!</p>
              )}
              {!loading && recentActivity.length > 0 && (
                <div className="space-y-3">
                  {recentActivity.map(entity => (
                    <div
                      key={entity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-300 truncate">
                            {entity.name}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded text-gray-500 capitalize">
                            {entity.entityType}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{entity.sourceDomain}</div>
                      </div>
                      <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Quick Start
              </h2>
              <div className="space-y-2">
                <Link
                  href={`/app/${projectId}/storyteller`}
                  className="block p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <span className="font-medium">→</span> Create a character
                </Link>
                <Link
                  href={`/app/${projectId}/loop-creator`}
                  className="block p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <span className="font-medium">→</span> Design a game loop
                </Link>
                <Link
                  href={`/app/${projectId}/world-gen`}
                  className="block p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <span className="font-medium">→</span> Build a world
                </Link>
              </div>
            </section>

            {/* Stats Summary */}
            <section className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Project Stats
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total Entities</span>
                  <span className="text-lg font-bold text-gray-100">{totalEntities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Active Domains</span>
                  <span className="text-lg font-bold text-gray-100">
                    {Object.values(domainStats).filter(v => v > 0).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Cross-Referenced</span>
                  <span className="text-lg font-bold text-gray-100">
                    {entities.filter(e => e.usedInDomains.length > 1).length}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
