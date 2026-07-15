'use client'

import Link from 'next/link'
import { useGameEntities } from '@/shared/data/queries/useGameEntities'
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
  Layers,
  Search,
  Tv,
  Map,
  Home,
  Brush,
  Activity,
} from 'lucide-react'
import { EntityPicker } from '@/components/EntityPicker'
import {
  AppModuleId,
  GameEntityKind,
  GameHubDomainDescription,
  GameHubDomainGradient,
  GameHubDomainLabel,
  GameHubDomainStats,
  GameHubEntityStatsSuffix,
  GameHubRouteId,
} from '@/components/shell/GameHubDashboard/constants/game-hub-dashboard'

interface GameHubDashboardProps {
  projectId: string
}

export function GameHubDashboard({ projectId }: GameHubDashboardProps) {
  const { entities, loading } = useGameEntities({ projectId, autoFetch: true })

  // Stats by entity type + domain, tallied in a single pass over entities.
  const stats = { characters: 0, locations: 0, mechanics: 0, factions: 0, items: 0, quests: 0 }
  const domainStats: Record<string, number> = {
    [AppModuleId.Storyteller]: 0,
    [AppModuleId.LoopCreator]: 0,
    [AppModuleId.InteriorDesigner]: 0,
    [AppModuleId.WorldBuilding]: 0,
  }
  for (const e of entities) {
    switch (e.entityType) {
      case GameEntityKind.Character: stats.characters++; break
      case GameEntityKind.Location: stats.locations++; break
      case GameEntityKind.Mechanic: stats.mechanics++; break
      case GameEntityKind.Faction: stats.factions++; break
      case GameEntityKind.Item: stats.items++; break
      case GameEntityKind.Quest: stats.quests++; break
    }
    for (const domain of e.usedInDomains) {
      if (domain in domainStats) domainStats[domain]++
    }
  }

  const totalEntities = entities.length

  // Domains/tools available
  const domains = [
    {
      id: GameHubRouteId.Storyteller,
      name: GameHubDomainLabel.Storyteller,
      description: GameHubDomainDescription.Storyteller,
      icon: <Tv className="w-5 h-5" />,
      color: GameHubDomainGradient.Storyteller,
      href: `/${projectId}/${GameHubRouteId.Storyteller}`,
      stats: `${domainStats[AppModuleId.Storyteller]} ${GameHubEntityStatsSuffix.Entities}`,
    },
    {
      id: GameHubRouteId.LoopCreator,
      name: GameHubDomainLabel.LoopCreator,
      description: GameHubDomainDescription.LoopCreator,
      icon: <Gamepad2 className="w-5 h-5" />,
      color: GameHubDomainGradient.LoopCreator,
      href: `/${projectId}/${GameHubRouteId.LoopCreator}`,
      stats: `${domainStats[AppModuleId.LoopCreator]} ${GameHubEntityStatsSuffix.Entities}`,
    },
    {
      id: GameHubRouteId.WorldGen,
      name: GameHubDomainLabel.WorldBuilder,
      description: GameHubDomainDescription.WorldBuilder,
      icon: <Map className="w-5 h-5" />,
      color: GameHubDomainGradient.WorldBuilder,
      href: `/${projectId}/${GameHubRouteId.WorldGen}`,
      stats: `${domainStats[AppModuleId.WorldBuilding]} ${GameHubEntityStatsSuffix.Entities}`,
    },
    {
      id: GameHubRouteId.InteriorDesign,
      name: GameHubDomainLabel.InteriorDesigner,
      description: GameHubDomainDescription.InteriorDesigner,
      icon: <Home className="w-5 h-5" />,
      color: GameHubDomainGradient.InteriorDesigner,
      href: `/${projectId}/${GameHubRouteId.InteriorDesign}`,
      stats: `${domainStats[AppModuleId.InteriorDesigner]} ${GameHubEntityStatsSuffix.Entities}`,
    },
    {
      id: GameHubRouteId.AssetExporter,
      name: GameHubDomainLabel.AssetExporter,
      description: GameHubDomainDescription.AssetExporter,
      icon: <Brush className="w-5 h-5" />,
      color: GameHubDomainGradient.AssetExporter,
      href: `/${projectId}/${GameHubRouteId.AssetExporter}`,
      stats: GameHubDomainStats.ExportTools,
    },
    // deduction-puzzle-designer deleted (user-confirmed, PLAN-V2 6.2)
  ]

  // Recent activity (mock for now - would come from actual activity log)
  const recentActivity = entities
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)


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
                    [AppModuleId.Storyteller]: `/${projectId}/${GameHubRouteId.Storyteller}`,
                    [AppModuleId.LoopCreator]: `/${projectId}/${GameHubRouteId.LoopCreator}`,
                    [AppModuleId.InteriorDesigner]: `/${projectId}/${GameHubRouteId.InteriorDesign}`,
                    [AppModuleId.WorldBuilding]: `/${projectId}/${GameHubRouteId.WorldGen}`,
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
                  href={`/${projectId}/${GameHubRouteId.Storyteller}`}
                  className="block p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <span className="font-medium">→</span> Create a character
                </Link>
                <Link
                  href={`/${projectId}/${GameHubRouteId.LoopCreator}`}
                  className="block p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg transition-colors text-sm text-gray-300"
                >
                  <span className="font-medium">→</span> Design a game loop
                </Link>
                <Link
                  href={`/${projectId}/${GameHubRouteId.WorldGen}`}
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
