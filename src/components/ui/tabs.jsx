import React, { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext({
  value: undefined,
  onValueChange: () => {},
})

export function Tabs({ value, onValueChange, className, children }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-gray-200 bg-white p-1',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext)
  const isActive = ctx.value === value
  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange?.(value)}
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(
        'px-4 py-2 rounded-md text-sm font-medium transition-colors',
        isActive ? 'bg-[var(--primary)] text-white' : 'text-gray-700 hover:bg-gray-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children, ...props }) {
  const ctx = useContext(TabsContext)
  if (ctx.value !== value) return null
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
