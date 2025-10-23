import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gold text-black shadow hover:bg-gold/80",
        profit:
          "border-transparent bg-profit/20 text-profit border-profit/30",
        loss:
          "border-transparent bg-loss/20 text-loss border-loss/30",
        warning:
          "border-transparent bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
        secondary:
          "border-transparent bg-slate-800 text-slate-200 hover:bg-slate-700",
        outline:
          "text-slate-300 border-slate-700",
        purple:
          "border-transparent bg-purple-500/20 text-purple-400 border-purple-500/30",
        cyan:
          "border-transparent bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
