// app/analyze/components/ConnectExchangeModal.js
'use client'

import { Upload, Link as LinkIcon, FileText, ArrowRight, Building2 } from 'lucide-react'
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
      id: 'snaptrade',
      icon: Building2,
      title: 'Connect via Snaptrade',
      description: 'Connect 20+ brokerages securely through Snaptrade. No API keys needed - OAuth connection.',
      benefits: ['20+ brokerages', 'No API keys', 'Secure OAuth', 'Robinhood, Coinbase, Fidelity'],
      recommended: false
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
      <DialogContent className="bg-black border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-base font-medium text-white/80">
            Connect Your Exchange
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs text-white/40">
            Choose how you'd like to import your trading data
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-2">
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
                className="group w-full text-left p-3.5 bg-black hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
                    <Icon className="w-4 h-4 text-white/60" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <h3 className="text-xs font-medium text-white/70">
                        {method.title}
                      </h3>
                      {method.recommended && (
                        <span className="px-1 py-0.5 text-[9px] font-medium text-white/40 bg-white/5 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-[11px] mb-2 leading-relaxed">
                      {method.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {method.benefits.map((benefit, idx) => (
                        <span 
                          key={idx} 
                          className="px-1 py-0.5 text-[9px] text-white/30 bg-white/5 rounded"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex items-start gap-1.5 text-[10px] text-white/30">
            <FileText className="w-3 h-3 text-white/20 flex-shrink-0 mt-0.5" />
            <p>
              <span className="font-medium text-white/40">Supported exchanges:</span>{' '}
              Binance, CoinDCX, Snaptrade (20+ brokerages), CSV upload
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
