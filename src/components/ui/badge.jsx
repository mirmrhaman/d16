import React from 'react'
import { cn } from '@/lib/utils'

export function Badge({ className, variant = 'solid', ...props }) {
  const styles =
    variant === 'outline'
      ? 'border border-current text-current bg-transparent'
      : 'bg-[var(--accent-light)] text-[var(--primary)]'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        styles,
        className,
      )}
      {...props}
    />
  )
}
