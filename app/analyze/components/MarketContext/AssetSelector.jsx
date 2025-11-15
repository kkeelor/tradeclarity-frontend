// app/analyze/components/MarketContext/AssetSelector.jsx
// PHASE 3 TASK 3.1: Asset Selector Component

'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Layers, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Asset Selector Component
 * Allows users to select which asset to view in charts and analysis
 */
export default function AssetSelector({
  detectedAssets,
  selectedAsset,
  onAssetChange,
  className = ''
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!detectedAssets || !detectedAssets.instruments || detectedAssets.instruments.length === 0) {
    return null
  }

  const instruments = detectedAssets.instruments || []
  const baseAssets = detectedAssets.baseAssets || []

  // Create asset options with display names
  const assetOptions = instruments.map((instrument, index) => {
    const baseAsset = baseAssets[index] || instrument.split('-')[0] || instrument
    return {
      instrument,
      baseAsset,
      displayName: `${baseAsset} (${instrument})`
    }
  })

  // Get current selected asset display name
  const selectedOption = assetOptions.find(opt => opt.instrument === selectedAsset)
  const selectedDisplayName = selectedOption 
    ? `${selectedOption.baseAsset} (${selectedOption.instrument})`
    : selectedAsset || 'Select Asset'

  // Persist selection to localStorage
  const handleChange = (value) => {
    onAssetChange(value)
    if (mounted) {
      try {
        localStorage.setItem('marketContext_selectedAsset', value)
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    if (mounted && !selectedAsset && instruments.length > 0) {
      try {
        const saved = localStorage.getItem('marketContext_selectedAsset')
        if (saved && instruments.includes(saved)) {
          onAssetChange(saved)
        } else if (instruments.length > 0) {
          // Default to first instrument
          onAssetChange(instruments[0])
        }
      } catch (e) {
        // Ignore localStorage errors, use first instrument
        if (instruments.length > 0) {
          onAssetChange(instruments[0])
        }
      }
    }
  }, [mounted, instruments, selectedAsset, onAssetChange])

  if (!mounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Zap className="w-4 h-4 text-emerald-400" />
        <div className="h-10 w-32 bg-slate-800 rounded-md animate-pulse" />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Select value={selectedAsset || instruments[0]} onValueChange={handleChange}>
          <SelectTrigger className="w-full sm:w-[200px] bg-black/40 border-slate-700 text-white hover:border-slate-600">
            <SelectValue placeholder="Select Asset">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{selectedOption?.baseAsset || selectedAsset?.split('-')[0] || 'Asset'}</span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {selectedAsset || instruments[0]}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-700 text-white">
            {assetOptions.map((option) => (
              <SelectItem
                key={option.instrument}
                value={option.instrument}
                className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{option.baseAsset}</span>
                    <span className="text-xs text-slate-400">{option.instrument}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="hidden sm:flex">
          {instruments.length} {instruments.length === 1 ? 'asset' : 'assets'}
        </Badge>
      </div>
    </div>
  )
}
