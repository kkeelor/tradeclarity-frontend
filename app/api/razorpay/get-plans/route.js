// app/api/razorpay/get-plans/route.js
import { NextResponse } from 'next/server'

export async function GET() {
  // Return Razorpay plan IDs (set in environment variables)
  return NextResponse.json({
    traderMonthly: process.env.RAZORPAY_PLAN_ID_TRADER_MONTHLY || '',
    traderAnnual: process.env.RAZORPAY_PLAN_ID_TRADER_ANNUAL || '',
    proMonthly: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY || '',
    proAnnual: process.env.RAZORPAY_PLAN_ID_PRO_ANNUAL || '',
  })
}
