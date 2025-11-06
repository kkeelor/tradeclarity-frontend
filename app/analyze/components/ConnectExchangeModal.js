// app/analyze/components/ConnectExchangeModal.js
'use client'

import { Upload, Link as LinkIcon, FileText, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function ConnectExchangeModal({ isOpen, onClose, onSelectMethod }) {
  const methods = [
    {
      id: 'api',
      icon: LinkIcon,
      title: 'Connect with API Keys',
      description: 'Live connection to your exchange. Get real-time data and automatic updates.',
      benefits: ['Real-time data', 'Automatic updates', 'No manual exports'],
      recommended: true
    },
    {
      id: 'csv',
      icon: Upload,
      title: 'Upload CSV File',
      description: 'Import your trade history manually. Good for one-time analysis or privacy.',
      benefits: ['One-time analysis', 'Full privacy', 'No API access needed'],
      recommended: false
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900/95 via-slate-900/95 to-slate-900/95 border-slate-700/50 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Connect Your Exchange</DialogTitle>
          <DialogDescription className="mt-1">Choose how you'd like to import your trading data</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 space-y-4">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectMethod(method.id)
                  // Don't call onClose here - let the parent handle it
                }}
                className="group relative overflow-hidden w-full text-left p-6 bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-800/30 hover:from-slate-800/80 hover:to-slate-800/60 border border-slate-700/50 hover:border-emerald-500/50 rounded-2xl transition-all backdrop-blur-sm hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all border ${
                    method.recommended
                      ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30 border-emerald-500/30'
                      : 'bg-blue-500/20 group-hover:bg-blue-500/30 border-blue-500/30'
                  }`}>
                    <Icon className={`w-7 h-7 ${
                      method.recommended ? 'text-emerald-400' : 'text-blue-400'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{method.title}</h3>
                      {method.recommended && (
                        <Badge variant="profit" className="px-2.5 py-1 text-xs font-semibold">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-3">
                      {method.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {method.benefits.map((benefit, idx) => (
                        <Badge key={idx} variant="secondary" className="px-2 py-1 text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="border-t border-slate-700 p-6 bg-slate-800/30">
          <div className="flex items-start gap-3 text-sm text-slate-400">
            <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-medium text-slate-300">Supported exchanges:</span> Binance, CoinDCX (more coming soon)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
