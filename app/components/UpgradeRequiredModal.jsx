// app/components/UpgradeRequiredModal.jsx
'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, X, AlertCircle, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from './Button'
import { getTierDisplayName } from '@/lib/featureGates'

/**
 * UpgradeRequiredModal Component
 * Shows when user tries to connect exchange but has reached their limit
 * Stores API keys temporarily and redirects to pricing for upgrade
 */
export default function UpgradeRequiredModal({
  open,
  onOpenChange,
  type = 'connection', // 'connection' | 'trade'
  current,
  limit,
  tier = 'free',
  upgradeTier,
  exchangeName,
  onUpgrade,
  onCancel
}) {
  const router = useRouter()
  
  const targetTier = upgradeTier || (tier === 'free' ? 'trader' : tier === 'trader' ? 'pro' : null)
  
  if (!targetTier) {
    return null // Already on Pro tier
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      // Store flag in sessionStorage to indicate we're upgrading for connection
      // The API keys are already stored in sessionStorage by LoginForm
      sessionStorage.setItem('upgradeForConnection', 'true')
      sessionStorage.setItem('upgradeReturnUrl', '/dashboard?autoConnect=true')
      
      // Redirect to pricing
      router.push('/pricing')
    }
    onOpenChange(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  const getMessage = () => {
    if (type === 'connection') {
      return `You've reached your connection limit (${current}/${limit}). Upgrade to ${getTierDisplayName(targetTier)} to connect ${exchangeName ? `${exchangeName} and ` : ''}more exchanges.`
    } else {
      return `You've reached your trade analysis limit (${current}/${limit}). Upgrade to ${getTierDisplayName(targetTier)} for ${targetTier === 'pro' ? 'unlimited' : 'more'} trades.`
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold text-white">
                Upgrade Required
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-400 mt-1">
                {getTierDisplayName(targetTier)} plan required
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300 leading-relaxed">
              {getMessage()}
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleUpgrade}
              className="w-full"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade to {getTierDisplayName(targetTier)}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Your API keys will be securely stored and the exchange will be connected automatically after upgrade.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
