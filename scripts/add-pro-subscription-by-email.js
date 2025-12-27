// Node.js script to add Pro subscription by email
// Usage: node scripts/add-pro-subscription-by-email.js <email>
// Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL environment variables
// 
// You can set them inline: 
//   SUPABASE_SERVICE_ROLE_KEY=xxx NEXT_PUBLIC_SUPABASE_URL=xxx node scripts/add-pro-subscription-by-email.js user@example.com
// Or use a .env file with dotenv-cli: npx dotenv-cli node scripts/add-pro-subscription-by-email.js user@example.com

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addProSubscription(email) {
  try {
    console.log(`🔍 Looking up user with email: ${email}`)
    
    // Find user by email from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`)
    }
    
    const user = authUsers.users.find(u => u.email === email)
    
    if (!user) {
      throw new Error(`User with email ${email} not found`)
    }
    
    console.log(`✅ Found user: ${user.id} (${user.email})`)
    
    // Calculate subscription dates
    const now = new Date()
    const oneYearLater = new Date(now)
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
    
    // Insert or update subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        tier: 'pro',
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: oneYearLater.toISOString(),
        cancel_at_period_end: false,
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (subError) {
      throw new Error(`Failed to create/update subscription: ${subError.message}`)
    }
    
    console.log('✅ Pro subscription added/updated successfully!')
    console.log('📋 Subscription details:', {
      user_id: subscription.user_id,
      tier: subscription.tier,
      status: subscription.status,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
    })
    
    return subscription
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

// Get email from command line arguments
const email = process.argv[2]

if (!email) {
  console.error('❌ Usage: node scripts/add-pro-subscription-by-email.js <email>')
  process.exit(1)
}

addProSubscription(email)
  .then(() => {
    console.log('✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Failed:', error)
    process.exit(1)
  })
