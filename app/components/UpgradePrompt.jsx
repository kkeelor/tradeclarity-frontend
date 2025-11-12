// app/components/UpgradePrompt.jsx
'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from './Button'
import { getTierDisplayName } from '@/lib/featureGates'

/**
 * UpgradePrompt Component
 * Reusable component for showing upgrade prompts when limits are reached
 * 
 * @param {Object} props
 * @param {string} props.type - Type of limit: 'connection' | 'trade' | 'feature'
 * @param {string} props.message - Custom message to display
 * @param {number} props.current - Current usage
 * @param {number} props.limit - Limit for current tier
 * @param {string} props.tier - Current tier ('free' | 'trader' | 'pro')
 * @param {string} props.upgradeTier - Tier to upgrade to ('trader' | 'pro')
 * @param {string} props.variant - Display variant: 'toast' | 'card' | 'inline'
 * @param {Function} props.onUpgrade - Custom upgrade handler (defaults to navigating to /pricing)
 * @param {boolean} props.compact - Use compact styling
 */
export default function UpgradePrompt({
  type,
  message,
  current,
  limit,
  tier = 'free',
  upgradeTier,
  variant = 'card',
  onUpgrade,
  compact = false
}) {
  const router = useRouter()

  // Determine upgrade tier if not provided
  const targetTier = upgradeTier || (tier === 'free' ? 'trader' : tier === 'trader' ? 'pro' : null)
  
  if (!targetTier) {
    // Already on Pro tier, no upgrade available
    return null
  }

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      router.push('/pricing')
    }
  }

  // Generate default message if not provided
  const getDefaultMessage = () => {
    if (message) return message
    
    const tierName = getTierDisplayName(targetTier)
    
    switch (type) {
      case 'connection':
        return `You've reached your connection limit (${current}/${limit}). Upgrade to ${tierName} to add more exchanges.`
      case 'trade':
        return `Adding these trades would exceed your monthly limit (${limit}). Upgrade to ${tierName} for ${targetTier === 'pro' ? 'unlimited' : 'more'} trades.`
      case 'feature':
        return `This feature requires ${tierName} plan. Upgrade to unlock it.`
      default:
        return `Upgrade to ${tierName} to unlock this feature.`
    }
  }

  const displayMessage = getDefaultMessage()

  // Toast variant - returns props for toast.error()
  if (variant === 'toast') {
    // This shouldn't render, but return toast config
    return null // Will be handled by helper function
  }

  // Inline variant - minimal inline display
  if (variant === 'inline') {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-slate-300">
        <AlertCircle className="w-3 h-3 text-amber-400" />
        <span>{displayMessage}</span>
        <button
          onClick={handleUpgrade}
          className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
        >
          Upgrade
        </button>
      </div>
    )
  }

  // Card variant (default) - full card display
  return (
    <div className={`rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/5 backdrop-blur p-${compact ? '3' : '4'} md:p-${compact ? '4' : '6'}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-${compact ? 'sm' : 'base'} font-semibold text-purple-300 mb-1`}>
            {compact ? 'Upgrade Required' : `Upgrade to ${getTierDisplayName(targetTier)}`}
          </h3>
          <p className={`text-${compact ? 'xs' : 'sm'} text-slate-300 mb-${compact ? '2' : '3'} leading-relaxed`}>
            {displayMessage}
          </p>
          <Button
            variant="primary"
            size={compact ? 'sm' : 'md'}
            onClick={handleUpgrade}
            className="w-full sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to {getTierDisplayName(targetTier)}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Helper function to get toast config for upgrade prompt
 * Usage: toast.error('Title', getUpgradeToastConfig({ type: 'connection', ... }))
 */
export function getUpgradeToastConfig(props) {
  const { type, message, current, limit, tier = 'free', upgradeTier } = props
  const targetTier = upgradeTier || (tier === 'free' ? 'trader' : tier === 'trader' ? 'pro' : null)
  
  if (!targetTier) return null

  const getDefaultMessage = () => {
    if (message) return message
    
    const tierName = getTierDisplayName(targetTier)
    
    switch (type) {
      case 'connection':
        return `You've reached your connection limit (${current}/${limit}). Upgrade to ${tierName} to add more exchanges.`
      case 'trade':
        return `Adding these trades would exceed your monthly limit (${limit}). Upgrade to ${tierName} for ${targetTier === 'pro' ? 'unlimited' : 'more'} trades.`
      case 'feature':
        return `This feature requires ${tierName} plan. Upgrade to unlock it.`
      default:
        return `Upgrade to ${tierName} to unlock this feature.`
    }
  }

  return {
    description: getDefaultMessage(),
    action: {
      label: `Upgrade to ${getTierDisplayName(targetTier)}`,
      onClick: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/pricing'
        }
      }
    },
    duration: 8000
  }
}

/**
 * Helper function to create upgrade prompt props from API error response
 * Usage: UpgradePrompt.fromApiError(errorData)
 */
export function getUpgradePromptFromApiError(errorData) {
  if (!errorData || (errorData.error !== 'CONNECTION_LIMIT_REACHED' && errorData.error !== 'TRADE_LIMIT_EXCEEDED')) {
    return null
  }

  const type = errorData.error === 'CONNECTION_LIMIT_REACHED' ? 'connection' : 'trade'
  
  return {
    type,
    message: errorData.message,
    current: errorData.current,
    limit: errorData.limit,
    tier: errorData.tier,
    upgradeTier: errorData.upgradeTier
  }
}
