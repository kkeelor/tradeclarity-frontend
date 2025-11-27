// lib/featureGates.js
// Feature gates and tier limits for TradeClarity pricing

export const TIER_LIMITS = {
  free: {
    maxConnections: 1,
    maxTradesPerMonth: 500,
    maxReportsPerMonth: 0,
    maxTokensPerMonth: 10000, // 10k tokens per month for free tier (testing)
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'pattern_details'
    ]
  },
  trader: {
    maxConnections: 3,
    maxTradesPerMonth: 1000,
    maxReportsPerMonth: Infinity,
    maxTokensPerMonth: 100000, // 100k tokens per month for trader tier (testing)
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'pattern_details'
    ]
  },
  pro: {
    maxConnections: Infinity,
    maxTradesPerMonth: Infinity,
    maxReportsPerMonth: Infinity,
    maxTokensPerMonth: 1000000, // 1M tokens per month for pro tier (testing)
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'pattern_details',
      'priority_support',
      'early_access'
    ]
  }
}

/**
 * Check if user can access a specific feature
 * @param {string|object} userTierOrSubscription - Tier string or subscription object
 * @param {string} feature - Feature name to check
 */
export function canAccessFeature(userTierOrSubscription, feature) {
  // If subscription object is passed, use effective tier
  const userTier = typeof userTierOrSubscription === 'object' 
    ? getEffectiveTier(userTierOrSubscription)
    : userTierOrSubscription
    
  const tierConfig = TIER_LIMITS[userTier] || TIER_LIMITS.free
  return tierConfig.features.includes(feature)
}

/**
 * Check if user can add another exchange connection
 */
export function canAddConnection(subscription) {
  if (!subscription) return false
  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const limit = TIER_LIMITS[effectiveTier]?.maxConnections || 1
  if (limit === Infinity) return true
  return subscription.exchanges_connected < limit
}

/**
 * Check if user can analyze additional trades
 */
export function canAnalyzeTrades(subscription, tradeCount = 1) {
  if (!subscription) return false
  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const limit = TIER_LIMITS[effectiveTier]?.maxTradesPerMonth || 500
  if (limit === Infinity) return true
  return (subscription.trades_analyzed_this_month + tradeCount) <= limit
}

/**
 * Check if user can generate a report
 */
export function canGenerateReport(subscription) {
  if (!subscription) return false
  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const limit = TIER_LIMITS[effectiveTier]?.maxReportsPerMonth || 0
  if (limit === Infinity) return true
  if (limit === 0) return false
  return subscription.reports_generated_this_month < limit
}

/**
 * Check if user can use AI tokens (based on monthly limit)
 * @param {object} subscription - Subscription object
 * @param {number} tokensUsed - Current tokens used this month
 * @param {number} tokensNeeded - Tokens needed for this request (optional, defaults to 0)
 */
export function canUseTokens(subscription, tokensUsed = 0, tokensNeeded = 0) {
  if (!subscription) {
    // Free tier defaults
    const limit = TIER_LIMITS.free.maxTokensPerMonth
    return (tokensUsed + tokensNeeded) <= limit
  }
  
  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const limit = TIER_LIMITS[effectiveTier]?.maxTokensPerMonth || TIER_LIMITS.free.maxTokensPerMonth
  
  if (limit === Infinity) return true
  return (tokensUsed + tokensNeeded) <= limit
}

/**
 * Get remaining quota for user
 */
export function getRemainingQuota(subscription) {
  if (!subscription) {
    return {
      connections: TIER_LIMITS.free.maxConnections,
      trades: TIER_LIMITS.free.maxTradesPerMonth,
      reports: TIER_LIMITS.free.maxReportsPerMonth
    }
  }

  // Use effective tier (considers cancel_at_period_end)
  const effectiveTier = getEffectiveTier(subscription)
  const limits = TIER_LIMITS[effectiveTier] || TIER_LIMITS.free
  return {
    connections: limits.maxConnections === Infinity
      ? 'Unlimited'
      : Math.max(0, limits.maxConnections - subscription.exchanges_connected),
    trades: limits.maxTradesPerMonth === Infinity
      ? 'Unlimited'
      : Math.max(0, limits.maxTradesPerMonth - subscription.trades_analyzed_this_month),
    reports: limits.maxReportsPerMonth === Infinity
      ? 'Unlimited'
      : Math.max(0, limits.maxReportsPerMonth - subscription.reports_generated_this_month)
  }
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier) {
  const names = {
    free: 'Free',
    trader: 'Trader',
    pro: 'Pro'
  }
  return names[tier] || 'Free'
}

/**
 * Get feature display name
 */
export function getFeatureName(feature) {
  const names = {
    basic_analytics: 'Basic Analytics',
    psychology_score: 'Psychology Score',
    top_insights: 'Top Insights',
    csv_upload: 'CSV Upload',
    all_insights: 'All Insights',
    historical_tracking: 'Historical Tracking',
    progress_charts: 'Progress Charts',
    period_comparisons: 'Period Comparisons',
    pdf_reports: 'PDF Reports',
    email_alerts: 'Email Alerts',
    pattern_details: 'Pattern Details',
    advanced_comparisons: 'Advanced Comparisons',
    cohort_analytics: 'Cohort Analytics',
    unlimited_reports: 'Unlimited Reports',
    custom_branding: 'Custom Branding',
    weekly_summaries: 'Weekly Summaries',
    data_export: 'Data Export',
    api_access: 'API Access'
  }
  return names[feature] || feature
}

/**
 * Check if subscription is active (including canceled subscriptions that haven't expired yet)
 */
export function isSubscriptionActive(subscription) {
  if (!subscription) return false
  
  // If status is active or trialing, it's active
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return true
  }
  
  // If canceled but period hasn't ended yet, still active
  if (subscription.status === 'canceled' && subscription.cancel_at_period_end) {
    const periodEnded = subscription.current_period_end
      ? new Date(subscription.current_period_end) < new Date()
      : false
    return !periodEnded // Active if period hasn't ended
  }
  
  return false
}

/**
 * Get effective tier for a subscription (considers cancel_at_period_end)
 * Returns the actual tier if subscription is still active, 'free' if expired
 */
export function getEffectiveTier(subscription) {
  if (!subscription) return 'free'
  
  // Normalize tier to lowercase to match TIER_LIMITS keys
  const normalizeTier = (tier) => {
    if (!tier) return 'free'
    const normalized = tier.toLowerCase().trim()
    // Ensure it's a valid tier
    if (['free', 'trader', 'pro'].includes(normalized)) {
      return normalized
    }
    console.warn(`Invalid tier value: "${tier}", defaulting to free`)
    return 'free'
  }
  
  const status = subscription.status?.toLowerCase()
  const tier = normalizeTier(subscription.tier)
  
  // If subscription is canceled but period hasn't ended, still use the tier
  if (status === 'canceled' && subscription.cancel_at_period_end) {
    const periodEnded = subscription.current_period_end
      ? new Date(subscription.current_period_end) < new Date()
      : false
    if (!periodEnded) {
      // Period hasn't ended - user still has access to their tier
      return tier
    }
    // Period ended - return free
    return 'free'
  }
  
  // If status is canceled and cancel_at_period_end is false, it was canceled immediately
  // User loses access immediately
  if (status === 'canceled' && !subscription.cancel_at_period_end) {
    return 'free'
  }
  
  // For active, trialing, or any other status, return the tier
  // This handles cases where status might be undefined or unexpected values
  return tier
}

/**
 * Get upgrade recommendation based on usage
 */
export function getUpgradeRecommendation(subscription) {
  if (!subscription) return null

  const quota = getRemainingQuota(subscription)
  const tier = subscription.tier

  // If already on Pro, no upgrade needed
  if (tier === 'pro') return null

  // Check if approaching limits
  const warnings = []
  
  if (typeof quota.connections === 'number' && quota.connections === 0) {
    warnings.push('connection_limit')
  } else if (typeof quota.connections === 'number' && quota.connections === 1) {
    warnings.push('connection_warning')
  }

  if (typeof quota.trades === 'number' && quota.trades === 0) {
    warnings.push('trade_limit')
  } else if (typeof quota.trades === 'number' && quota.trades < 20) {
    warnings.push('trade_warning')
  }

  if (subscription.tier === 'free' && warnings.length > 0) {
    return {
      tier: 'trader',
      reason: warnings[0]
    }
  }

  if (subscription.tier === 'trader' && warnings.length > 0) {
    return {
      tier: 'pro',
      reason: warnings[0]
    }
  }

  return null
}
