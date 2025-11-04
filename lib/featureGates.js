// lib/featureGates.js
// Feature gates and tier limits for TradeClarity pricing

export const TIER_LIMITS = {
  free: {
    maxConnections: 1,
    maxTradesPerMonth: 100,
    maxReportsPerMonth: 0,
    features: [
      'basic_analytics',
      'psychology_score',
      'top_insights',
      'csv_upload'
    ]
  },
  trader: {
    maxConnections: 3,
    maxTradesPerMonth: 500,
    maxReportsPerMonth: 10,
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'historical_tracking',
      'progress_charts',
      'period_comparisons',
      'pdf_reports',
      'email_alerts',
      'pattern_details'
    ]
  },
  pro: {
    maxConnections: Infinity,
    maxTradesPerMonth: Infinity,
    maxReportsPerMonth: Infinity,
    features: [
      'basic_analytics',
      'psychology_score',
      'all_insights',
      'csv_upload',
      'historical_tracking',
      'progress_charts',
      'period_comparisons',
      'pdf_reports',
      'email_alerts',
      'pattern_details',
      'advanced_comparisons',
      'cohort_analytics',
      'unlimited_reports',
      'custom_branding',
      'weekly_summaries',
      'data_export',
      'api_access'
    ]
  }
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(userTier, feature) {
  const tierConfig = TIER_LIMITS[userTier] || TIER_LIMITS.free
  return tierConfig.features.includes(feature)
}

/**
 * Check if user can add another exchange connection
 */
export function canAddConnection(subscription) {
  if (!subscription) return false
  const limit = TIER_LIMITS[subscription.tier]?.maxConnections || 1
  if (limit === Infinity) return true
  return subscription.exchanges_connected < limit
}

/**
 * Check if user can analyze additional trades
 */
export function canAnalyzeTrades(subscription, tradeCount = 1) {
  if (!subscription) return false
  const limit = TIER_LIMITS[subscription.tier]?.maxTradesPerMonth || 100
  if (limit === Infinity) return true
  return (subscription.trades_analyzed_this_month + tradeCount) <= limit
}

/**
 * Check if user can generate a report
 */
export function canGenerateReport(subscription) {
  if (!subscription) return false
  const limit = TIER_LIMITS[subscription.tier]?.maxReportsPerMonth || 0
  if (limit === Infinity) return true
  if (limit === 0) return false
  return subscription.reports_generated_this_month < limit
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

  const limits = TIER_LIMITS[subscription.tier] || TIER_LIMITS.free
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
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription) {
  if (!subscription) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
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
