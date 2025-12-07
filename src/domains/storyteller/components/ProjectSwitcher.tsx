import React, { useEffect, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Project {
  id: string
  name: string
}

interface ProjectSwitcherProps {
  currentProject: Project | null
  onProjectChange: (project: Project) => void
}

export const ProjectSwitcher: React.FC<ProjectSwitcherProps> = ({
  currentProject,
  onProjectChange,
}) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetch('/api/storyteller/projects')
      .then(res => res.json())
      .then(data => setProjects(data))
  }, [])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="w-full justify-between font-bold text-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {currentProject ? currentProject.name : 'Select Project'}
        <ChevronDown size={16} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-neutral-800 border border-neutral-700 rounded-md shadow-xl z-50 mt-1">
          {projects.map(p => (
            <div
              key={p.id}
              className="px-4 py-2 hover:bg-neutral-700 cursor-pointer text-sm"
              onClick={() => {
                onProjectChange(p)
                setIsOpen(false)
              }}
            >
              {p.name}
            </div>
          ))}
          <div className="border-t border-neutral-700 p-2">
            <Button size="sm" variant="secondary" className="w-full text-xs">
              <Plus size={12} className="mr-1" /> New Project
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
