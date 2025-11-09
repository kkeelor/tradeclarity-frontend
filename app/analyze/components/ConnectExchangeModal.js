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
      <DialogContent className="bg-slate-900 border-slate-700/50 max-w-2xl max-h-[90vh] overflow-y-auto p-5 md:p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-bold text-white">
            Connect Your Exchange
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-slate-300">
            Choose how you'd like to import your trading data
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-3">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSelectMethod(method.id)
                }}
                className="group w-full text-left p-4 md:p-5 bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all ${
                    method.recommended
                      ? 'bg-emerald-500/20 border border-emerald-500/30 group-hover:bg-emerald-500/30'
                      : 'bg-slate-700/50 border border-slate-600/50 group-hover:bg-slate-700/70'
                  }`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${
                      method.recommended ? 'text-emerald-400' : 'text-slate-300'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        {method.title}
                      </h3>
                      {method.recommended && (
                        <Badge variant="profit" className="px-2 py-0.5 text-xs font-semibold !text-emerald-400">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm mb-3 leading-relaxed">
                      {method.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {method.benefits.map((benefit, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-200 border-slate-600/50"
                        >
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-5 pt-4 border-t border-slate-700/50">
          <div className="flex items-start gap-2.5 text-xs md:text-sm text-slate-300">
            <FileText className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-white">Supported exchanges:</span>{' '}
              Binance, CoinDCX (more coming soon)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
