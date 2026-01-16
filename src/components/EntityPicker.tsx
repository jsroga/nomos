import { useState, useEffect } from 'react'
import { useGameEntities, GameEntity, EntityType } from '@/hooks/useGameEntities'
import { Search, Users, MapPin, Gamepad2, Shield, Package, Target } from 'lucide-react'

interface EntityPickerProps {
  projectId: string
  onSelectEntity: (entity: GameEntity) => void
  filterType?: EntityType
  placeholder?: string
  className?: string
}

const ENTITY_ICONS: Record<EntityType, React.ElementType> = {
  character: Users,
  location: MapPin,
  mechanic: Gamepad2,
  faction: Shield,
  item: Package,
  quest: Target,
}

const ENTITY_COLORS: Record<EntityType, string> = {
  character: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  location: 'bg-green-500/10 text-green-500 border-green-500/20',
  mechanic: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  faction: 'bg-red-500/10 text-red-500 border-red-500/20',
  item: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  quest: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

export function EntityPicker({
  projectId,
  onSelectEntity,
  filterType,
  placeholder = 'Search entities across all domains...',
  className = '',
}: EntityPickerProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  
  const { entities, loading } = useGameEntities({
    projectId,
    entityType: filterType,
    search: search.length > 0 ? search : undefined,
    autoFetch: true,
  })

  const handleSelect = (entity: GameEntity) => {
    onSelectEntity(entity)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Results */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-400 text-sm">
                Loading entities...
              </div>
            )}
            
            {!loading && entities.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">
                {search ? 'No entities found' : 'No entities in this project yet'}
              </div>
            )}
            
            {!loading && entities.length > 0 && (
              <div className="divide-y divide-gray-800">
                {entities.map((entity) => {
                  const Icon = ENTITY_ICONS[entity.entityType]
                  const colorClass = ENTITY_COLORS[entity.entityType]
                  
                  return (
                    <button
                      key={entity.id}
                      onClick={() => handleSelect(entity)}
                      className="w-full p-3 hover:bg-gray-800/50 transition-colors text-left flex items-start gap-3"
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-100 truncate">
                            {entity.name}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">
                            {entity.entityType}
                          </span>
                        </div>
                        
                        {entity.description && (
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {entity.description}
                          </p>
                        )}
                        
                        {/* Domain badges */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                            From: {entity.sourceDomain}
                          </span>
                          {entity.usedInDomains.length > 1 && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                              Used in {entity.usedInDomains.length} domains
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Image */}
                      {entity.imageUrl && (
                        <img
                          src={entity.imageUrl}
                          alt={entity.name}
                          className="flex-shrink-0 w-12 h-12 rounded object-cover"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Compact entity selector button - opens modal with entity picker
 */
interface EntitySelectorButtonProps {
  projectId: string
  onSelectEntity: (entity: GameEntity) => void
  filterType?: EntityType
  label?: string
}

export function EntitySelectorButton({
  projectId,
  onSelectEntity,
  filterType,
  label = 'Add Entity',
}: EntitySelectorButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-sm border border-blue-500/20 transition-colors"
      >
        {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">
              Select Entity
            </h3>
            
            <EntityPicker
              projectId={projectId}
              onSelectEntity={(entity) => {
                onSelectEntity(entity)
                setIsOpen(false)
              }}
              filterType={filterType}
            />
            
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

