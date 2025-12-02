/* eslint-disable */
import React, { useState } from 'react'
import { Box, Loader2, Cuboid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThreeDViewer } from './ThreeDViewer'
import { threeDService, ThreeDProvider } from '../services/ThreeDService'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { supabase } from '@/infrastructure/storage/supabase'
import toast from 'react-hot-toast'

interface ThreeDPanelProps {
  assetId: string
  imageUrl: string
  initialModelUrl?: string
}

export const ThreeDPanel: React.FC<ThreeDPanelProps> = ({ assetId, imageUrl, initialModelUrl }) => {
  const [modelUrl, setModelUrl] = useState<string | undefined>(initialModelUrl)
  const [provider, setProvider] = useState<ThreeDProvider>('meshy')
  const [isGenerating, setIsGenerating] = useState(false)
  const currentProject = useWorldStore(state => state.currentProject)
  const updateAsset = useWorldStore(state => state.updateAsset)

  const handleGenerate = async () => {
    if (!currentProject) return

    setIsGenerating(true)
    try {
      // 1. Call 3D Gen Service
      toast.loading("Generating 3D Model... This may take a few minutes.")
      
      const generatedModelUrl = await threeDService.generateModel(imageUrl, provider)
      
      toast.dismiss()
      toast.success("3D Model Generated!")

      // 2. Save Model locally
      const filename = `model_${assetId}_${Date.now()}.glb`
      
      const saveResponse = await fetch('/api/save-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          filename,
          modelUrl: generatedModelUrl
        })
      })

      if (!saveResponse.ok) throw new Error("Failed to save model locally")

      const { path } = await saveResponse.json()
      
      // 3. Update Asset Record in Supabase
      const { error } = await supabase
        .from('assets')
        .update({ model_filename: filename } as any) // Cast as any because we haven't updated types in Supabase client generated types yet
        .eq('id', assetId)

      if (error) throw error

      // 4. Update Store
      updateAsset(assetId, { model_filename: filename })
      setModelUrl(path)

    } catch (error: any) {
      console.error(error)
      toast.dismiss()
      toast.error(`Generation Failed: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Box size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">3D Preview</h3>
        </div>
        
        {!modelUrl && (
           <div className="flex items-center gap-2">
               <select 
                 className="h-8 text-xs bg-background border border-input rounded px-2 outline-none focus:ring-1 focus:ring-primary"
                 value={provider}
                 onChange={(e) => setProvider(e.target.value as ThreeDProvider)}
                 disabled={isGenerating}
               >
                   <option value="meshy">Meshy (Fast)</option>
                   <option value="hyper3d">Hyper3D (High Quality)</option>
               </select>
               <Button 
                 size="sm" 
                 onClick={handleGenerate}
                 disabled={isGenerating}
                 className="gap-1"
               >
                   {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Cuboid size={14} />}
                   Generate 3D
               </Button>
           </div>
        )}
      </div>

      <div className="flex-1 relative bg-[#1a1a1a] flex flex-col items-center justify-center">
          {modelUrl ? (
              <ThreeDViewer modelUrl={modelUrl} />
          ) : (
             <div className="text-center p-8 text-muted-foreground space-y-2">
                 <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mx-auto mb-4">
                     {isGenerating ? (
                         <Loader2 size={32} className="animate-spin opacity-50" />
                     ) : (
                         <Box size={32} className="opacity-20" />
                     )}
                 </div>
                 <h4 className="font-medium">No 3D Model</h4>
                 <p className="text-xs max-w-[200px] mx-auto">
                    {isGenerating 
                        ? "Generating your model. This can take 2-5 minutes depending on the provider." 
                        : "Select a provider and click Generate to create a 3D model from your 2D asset."}
                 </p>
             </div>
          )}
      </div>
      
      {modelUrl && (
          <div className="p-3 border-t border-border bg-muted/10 text-xs text-muted-foreground flex justify-between">
             <span>{modelUrl.split('/').pop()}</span>
             <button 
                onClick={() => setModelUrl(undefined)} // Just clear preview for now, or maybe re-generate
                className="text-primary hover:underline"
             >
                 Regenerate
             </button>
          </div>
      )}
    </div>
  )
}

