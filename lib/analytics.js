// lib/analytics.js
// Vercel Analytics event tracking utility

import { track } from '@vercel/analytics'

/**
 * Track user authentication events
 */
export const trackAuth = {
  signup: (method = 'unknown') => {
    track('user_signup', { method })
  },
  login: (method = 'unknown') => {
    track('user_login', { method })
  },
  signout: () => {
    track('user_signout')
  }
}

/**
 * Track subscription conversion events
 */
export const trackSubscription = {
  pricingPageView: () => {
    track('pricing_page_view')
  },
  upgradeButtonClick: (tier, billingCycle = 'monthly') => {
    track('upgrade_button_click', { tier, billing_cycle: billingCycle })
  },
  paymentInitiated: (tier, billingCycle, currency, amount) => {
    track('payment_initiated', { tier, billing_cycle: billingCycle, currency, amount })
  },
  paymentCompleted: (tier, billingCycle, currency, amount) => {
    track('payment_completed', { tier, billing_cycle: billingCycle, currency, amount })
  },
  subscriptionActivated: (tier, billingCycle) => {
    track('subscription_activated', { tier, billing_cycle: billingCycle })
  }
}

/**
 * Track data connection events
 */
export const trackDataConnection = {
  exchangeConnectInitiated: (exchange) => {
    track('exchange_connect_initiated', { exchange })
  },
  exchangeConnectSuccess: (exchange) => {
    track('exchange_connect_success', { exchange })
  },
  exchangeConnectFailure: (exchange, errorType) => {
    track('exchange_connect_failure', { exchange, error_type: errorType })
  },
  csvUploadInitiated: () => {
    track('csv_upload_initiated')
  },
  csvUploadSuccess: (fileCount, tradeCount) => {
    track('csv_upload_success', { file_count: fileCount, trade_count: tradeCount })
  },
  csvUploadFailure: (errorType) => {
    track('csv_upload_failure', { error_type: errorType })
  },
  firstExchangeConnected: (exchange) => {
    track('first_exchange_connected', { exchange })
  },
  firstCsvUploaded: () => {
    track('first_csv_uploaded')
  }
}

/**
 * Track core feature usage
 */
export const trackFeatureUsage = {
  analyticsViewed: () => {
    track('analytics_viewed')
  },
  analyticsTabSwitched: (tab) => {
    track('analytics_tab_switched', { tab })
  },
  aiChatMessageSent: (conversationId, isDemoMode = false) => {
    track('ai_chat_message_sent', { conversation_id: conversationId, is_demo_mode: isDemoMode })
  },
  aiConversationStarted: () => {
    track('ai_conversation_started')
  },
  conversationShared: (conversationId) => {
    track('conversation_shared', { conversation_id: conversationId })
  },
  sharedConversationViewed: (shareId) => {
    track('shared_conversation_viewed', { share_id: shareId })
  },
  firstAnalyticsComputed: () => {
    track('first_analytics_computed')
  },
  firstAiMessage: () => {
    track('first_ai_message')
  }
}

/**
 * Track feature discovery
 */
export const trackFeatureDiscovery = {
  demoModeStarted: () => {
    track('demo_mode_started')
  },
  coachModeEnabled: () => {
    track('coach_mode_enabled')
  },
  snaptradeConnectInitiated: () => {
    track('snaptrade_connect_initiated')
  }
}

/**
 * Track upgrade prompts and limits
 */
export const trackUpgradePrompts = {
  upgradePromptShown: (reason, currentTier) => {
    track('upgrade_prompt_shown', { reason, current_tier: currentTier })
  },
  upgradePromptClicked: (targetTier) => {
    track('upgrade_prompt_clicked', { target_tier: targetTier })
  },
  connectionLimitReached: (currentTier, currentCount) => {
    track('connection_limit_reached', { current_tier: currentTier, current_count: currentCount })
  },
  featureLimitReached: (featureName, currentTier) => {
    track('feature_limit_reached', { feature_name: featureName, current_tier: currentTier })
  }
}

/**
 * Track page views
 */
export const trackPageView = (pageName) => {
  track('page_view', { page_name: pageName })
}
