// app/analyze/components/MarketContext/ChartDialog.jsx
// PHASE 7 TASK 7.2: Chart Dialog Wrapper Component

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Maximize2, X } from 'lucide-react'

/**
 * PHASE 7 TASK 7.2: Chart Dialog Wrapper
 * Wraps a chart component with compact preview and full-screen dialog
 */
export function ChartDialog({
  title,
  description,
  previewComponent,
  fullChartComponent,
  previewHeight = 150,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Compact Preview */}
      <div className={`bg-black/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
        <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            aria-label={`View full ${title} chart`}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <div 
          className="cursor-pointer hover:bg-slate-800/30 transition-colors"
          onClick={() => setIsOpen(true)}
          style={{ height: `${previewHeight}px` }}
        >
          {previewComponent}
        </div>
      </div>

      {/* Full Chart Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-[95vw] max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
                {description && (
                  <p className="text-sm text-slate-400 mt-1">{description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                aria-label="Close chart"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
            {fullChartComponent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * PHASE 7 TASK 7.2: Compact Chart Preview Component
 * Creates a compact preview of a chart
 */
export function CompactChartPreview({ 
  chartComponent, 
  height = 150,
  onClick 
}) {
  return (
    <div 
      className="w-full cursor-pointer"
      onClick={onClick}
      style={{ height: `${height}px` }}
    >
      {chartComponent}
    </div>
  )
}
