import React from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]',
  outline: 'border border-current text-[var(--primary)] bg-white hover:bg-[var(--accent-light)]',
}

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10 p-0',
}

export const Button = React.forwardRef(function Button(
  { className, variant = 'default', size = 'default', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className,
      )}
      {...props}
    />
  )
})
