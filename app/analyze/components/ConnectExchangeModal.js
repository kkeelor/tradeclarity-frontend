// app/analyze/components/ConnectExchangeModal.js
'use client'

import { useState } from 'react'
import { X, Upload, Link as LinkIcon, FileText, ArrowRight } from 'lucide-react'

export default function ConnectExchangeModal({ isOpen, onClose, onSelectMethod }) {
  if (!isOpen) return null

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
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Connect Your Exchange</h2>
            <p className="text-slate-400 mt-1">Choose how you'd like to import your trading data</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {methods.map((method) => {
            const Icon = method.icon
            return (
              <button
                key={method.id}
                onClick={() => {
                  onSelectMethod(method.id)
                  onClose()
                }}
                className="group relative w-full text-left p-6 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    method.recommended
                      ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                      : 'bg-blue-500/20 group-hover:bg-blue-500/30'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      method.recommended ? 'text-emerald-400' : 'text-blue-400'
                    }`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{method.title}</h3>
                      {method.recommended && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-3">
                      {method.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {method.benefits.map((benefit, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md"
                        >
                          {benefit}
                        </span>
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
      </div>
    </div>
  )
}
