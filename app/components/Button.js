// app/components/Button.js
'use client'

import { Button as ShadcnButton } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * Reusable button component with multiple variants and sizes
 * Built on shadcn Button component with custom variants for the app
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  ...props
}) {
  // Map custom variants to shadcn variants where applicable
  const variantMap = {
    primary: "profit",
    secondary: "secondary",
    gradient: "primary", // Use gold gradient for gradient variant
    outline: "outline",
    ghost: "ghost",
    danger: "danger",
  }

  const sizeMap = {
    sm: "sm",
    md: "default",
    lg: "lg",
  }

  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      disabled={disabled}
      className={cn("hover:scale-105", className)}
      {...props}
    >
      {children}
    </ShadcnButton>
  )
}

/**
 * Icon button variant
 */
export function IconButton({
  icon: Icon,
  variant = "ghost",
  size = "md",
  className = "",
  ...props
}) {
  const variantMap = {
    primary: "profit",
    ghost: "ghost",
    danger: "danger",
  }

  return (
    <ShadcnButton
      variant={variantMap[variant]}
      size="icon"
      className={cn(className)}
      {...props}
    >
      <Icon className={size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5"} />
    </ShadcnButton>
  )
}

/**
 * Tab button variant
 */
export function TabButton({ active, children, ...props }) {
  return (
    <ShadcnButton
      variant={active ? "secondary" : "ghost"}
      className={cn(
        "flex-1 text-base rounded-none",
        active && "border-b-2 border-profit"
      )}
      {...props}
    >
      {children}
    </ShadcnButton>
  )
}

/**
 * Filter button variant (for time ranges, etc.)
 */
export function FilterButton({ active, children, className, ...props }) {
  return (
    <ShadcnButton
      variant={active ? "profit" : "secondary"}
      size="sm"
      className={cn(className)}
      {...props}
    >
      {children}
    </ShadcnButton>
  )
}
