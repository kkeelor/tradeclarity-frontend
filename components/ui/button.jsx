import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gold text-black hover:bg-gold/90 shadow-lg shadow-gold/20 hover:shadow-gold/40",
        primary:
          "bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-black shadow-lg hover:shadow-2xl hover:shadow-gold-500/50",
        profit:
          "bg-profit text-black hover:bg-profit/90 shadow-lg shadow-profit/20",
        danger:
          "bg-loss text-white hover:bg-loss/90 shadow-lg shadow-loss/20",
        outline:
          "border-2 border-slate-700 bg-transparent hover:bg-slate-800 hover:border-gold/50 text-white",
        ghost:
          "hover:bg-slate-800 hover:text-white text-slate-300",
        link:
          "text-gold underline-offset-4 hover:underline",
        secondary:
          "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
