// app/snaptrade/loading/page.js
// Loading page shown while Snaptrade connection URL is being generated
'use client'

import { Loader2 } from 'lucide-react'

export default function SnaptradeLoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Connecting to Snaptrade</h2>
          <p className="text-white/60 text-sm">
            Preparing your brokerage connection...
          </p>
        </div>
      </div>
    </div>
  )
}
