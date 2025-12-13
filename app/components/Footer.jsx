// app/components/Footer.jsx
'use client'

import Link from 'next/link'
import { Twitter, Linkedin } from 'lucide-react'
import { Separator } from '@/components/ui'

export default function Footer() {
  return (
    <footer className="py-6 md:py-8 px-4 md:px-6 text-center text-slate-500 text-xs md:text-sm space-y-4 border-t border-white/5 mt-auto">
      <div className="flex items-center justify-center gap-4">
        <a
          href="https://x.com/trdclrty"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-slate-300 transition-colors group"
        >
          <Twitter className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
          <span className="hidden sm:inline">@trdclrty</span>
        </a>
        <Separator className="text-slate-700" />
        <a
          href="https://www.linkedin.com/in/karankeelor/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-slate-300 transition-colors group"
        >
          <Linkedin className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
          <span className="hidden sm:inline">LinkedIn</span>
        </a>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <Link href="/pricing" className="hover:text-emerald-400 transition-colors font-medium">Pricing</Link>
        <Separator className="text-slate-700" />
        <Link href="/faq" className="hover:text-emerald-400 transition-colors font-medium">FAQ</Link>
        <Separator className="text-slate-700" />
        <Link href="/contact" className="hover:text-emerald-400 transition-colors font-medium">Contact Us</Link>
        <Separator className="text-slate-700" />
        <Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">Terms & Conditions</Link>
        <Separator className="text-slate-700" />
        <Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
        <Separator className="text-slate-700" />
        <Link href="/legal/cancellation-refunds" className="hover:text-emerald-400 transition-colors">Cancellation & Refunds</Link>
        <Separator className="text-slate-700" />
        <Link href="/legal/shipping" className="hover:text-emerald-400 transition-colors">Shipping Policy</Link>
      </div>
      <p className="font-medium">Built for traders who are tired of guessing</p>
      <p className="text-xs text-slate-500/70 max-w-2xl mx-auto">
        <strong>Disclaimer:</strong> TradeClarity and Vega AI provide AI-powered trading insights and analysis tools. 
        This is not financial advice. Always conduct your own research and consult with a qualified financial advisor before making trading decisions. 
        Past performance does not guarantee future results.
      </p>
      <p>&copy; 2025 TradeClarity. Your data stays yours. Always.</p>
    </footer>
  )
}
