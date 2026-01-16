'use client'

import { useState, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Slider } from '@/components/ui/slider'

interface FluidControlsProps {
  zoom: number
  rotation: number
  colorShift: number
  saturation: number
  brightness: number
  contrast: number
  hue: number
  onZoomChange: (value: number) => void
  onRotationChange: (value: number) => void
  speed: number
  onSpeedChange: (value: number) => void
  morphSpeed: number
  onMorphSpeedChange: (value: number) => void
  onColorShiftChange: (value: number) => void
  onSaturationChange: (value: number) => void
  onBrightnessChange: (value: number) => void
  onContrastChange: (value: number) => void
  onHueChange: (value: number) => void
  // LiquidGL Control Props
  refraction?: number
  onRefractionChange?: (val: number) => void
  bevelWidth?: number
  onBevelWidthChange?: (val: number) => void
  bevelDepth?: number
  onBevelDepthChange?: (val: number) => void
  intensity?: number
  onIntensityChange?: (val: number) => void
  frost?: number
  onFrostChange?: (val: number) => void
  onReset?: () => void
}

export function FluidControls({
  zoom,
  rotation,
  colorShift,
  saturation,
  brightness,
  contrast,
  hue,
  onZoomChange,
  onRotationChange,
  speed,
  onSpeedChange,
  morphSpeed,
  onMorphSpeedChange,
  onColorShiftChange,
  onSaturationChange,
  onBrightnessChange,
  onContrastChange,
  onHueChange,
  // LiquidGL Defaults
  refraction = 0.04,
  onRefractionChange,
  bevelWidth = 0.02,
  onBevelWidthChange,
  bevelDepth = 0.3,
  onBevelDepthChange,
  intensity = 0.3,
  onIntensityChange,
  frost = 0.1,
  onFrostChange,
  onReset,
}: FluidControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Toggle with 'S' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
        title="Toggle Settings (S)"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-20 right-6 z-50 w-80 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-lg">Fluid Controls</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {/* Zoom Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Zoom: {zoom.toFixed(2)}x
                </label>
                <Slider
                  min={0.1}
                  max={3}
                  step={0.01}
                  value={[zoom]}
                  onValueChange={vals => onZoomChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Rotation Control */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Rotation</span>
                  <span>{Math.round((rotation * 180) / Math.PI)}°</span>
                </label>
                <Slider
                  min={0}
                  max={Math.PI * 2}
                  step={0.01}
                  value={[rotation]}
                  onValueChange={vals => onRotationChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Flow Speed Control - Adjusted for finer slow control */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Flow Speed</span>
                  <span>{speed.toFixed(2)}x</span>
                </label>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={[speed]}
                  onValueChange={vals => onSpeedChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Morph Speed Control - New */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Morph Speed</span>
                  <span>{morphSpeed.toFixed(1)}x</span>
                </label>
                <Slider
                  min={0}
                  max={5}
                  step={0.1}
                  value={[morphSpeed]}
                  onValueChange={vals => onMorphSpeedChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Brightness Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Brightness: {(brightness * 100).toFixed(0)}%
                </label>
                <Slider
                  min={0}
                  max={3}
                  step={0.01}
                  value={[brightness]}
                  onValueChange={vals => onBrightnessChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Contrast Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Contrast: {(contrast * 100).toFixed(0)}%
                </label>
                <Slider
                  min={0}
                  max={3}
                  step={0.01}
                  value={[contrast]}
                  onValueChange={vals => onContrastChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Saturation Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Saturation: {(saturation * 100).toFixed(0)}%
                </label>
                <Slider
                  min={0}
                  max={3}
                  step={0.01}
                  value={[saturation]}
                  onValueChange={vals => onSaturationChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Hue Shift Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Hue Shift: {(hue * 360).toFixed(0)}°
                </label>
                <Slider
                  min={-1}
                  max={1}
                  step={0.01}
                  value={[hue]}
                  onValueChange={vals => onHueChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Color Shift Control */}
              <div>
                <label className="text-white/80 text-sm font-medium block mb-2">
                  Color Shift: {colorShift.toFixed(2)}
                </label>
                <Slider
                  min={-1}
                  max={1}
                  step={0.01}
                  value={[colorShift]}
                  onValueChange={vals => onColorShiftChange(vals[0])}
                  className="w-full"
                />
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  onZoomChange(0.1)
                  onRotationChange(3.33)
                  onSpeedChange(1.0)
                  onMorphSpeedChange(0.5)
                  onColorShiftChange(0)
                  onSaturationChange(0.65)
                  onBrightnessChange(2.39)
                  onContrastChange(1.32)
                  onHueChange(0)
                  onReset?.()
                }}
                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
              >
                Reset to Defaults
              </button>
            </div>

            {/* LiquidGL Specific Settings */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4 max-h-[35vh] overflow-y-auto pr-2">
              <h4 className="text-white font-bold text-sm mb-2 sticky top-0 bg-black/40 backdrop-blur-md py-1">
                Liquid Card Settings
              </h4>

              {/* Refraction */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Refraction</span>
                  <span>{refraction.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.001"
                  value={refraction}
                  onChange={e => onRefractionChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Bevel Width */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Bevel Width</span>
                  <span>{bevelWidth.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.1"
                  step="0.001"
                  value={bevelWidth}
                  onChange={e => onBevelWidthChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Bevel Depth */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Bevel Depth</span>
                  <span>{bevelDepth.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={bevelDepth}
                  onChange={e => onBevelDepthChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Intensity */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Intensity</span>
                  <span>{intensity.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={intensity}
                  onChange={e => onIntensityChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Frost */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 flex justify-between">
                  <span>Frost</span>
                  <span>{frost.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={frost}
                  onChange={e => onFrostChange?.(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <p className="text-white/40 text-xs mt-4 text-center">
              Press <kbd className="px-1 py-0.5 bg-white/10 rounded">S</kbd> to toggle
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  )
}
