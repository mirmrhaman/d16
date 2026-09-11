import React, { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

function parseOptions(children) {
  const options = []
  let triggerProps = {}

  React.Children.forEach(children, (child) => {
    if (!child?.type) return

    if (child.type.displayName === 'SelectContent') {
      React.Children.forEach(child.props.children, (item) => {
        if (!item?.props) return
        options.push({ value: item.props.value, label: item.props.children })
      })
    }

    if (child.type.displayName === 'SelectTrigger') {
      triggerProps = child.props || {}
    }
  })

  const placeholder = React.Children.toArray(triggerProps.children).find((child) => child?.type?.displayName === 'SelectValue')?.props.placeholder;
  return { options, triggerProps, placeholder }
}

export function Select({ value, defaultValue = '', onValueChange, className, children, ...props }) {
  const controlled = value !== undefined
  const [internal, setInternal] = useState(value ?? defaultValue)

  useEffect(() => {
    if (controlled) setInternal(value)
  }, [value, controlled])

  const setValue = (val) => {
    if (!controlled) setInternal(val)
    onValueChange?.(val)
  }

  const { options, triggerProps, placeholder } = useMemo(() => parseOptions(children), [children])

  useEffect(() => {
    if (!controlled && !internal && !placeholder && options.length > 0) {
      setInternal(options[0].value)
    }
  }, [controlled, internal, options, placeholder])

  return (
    <div className={cn('relative w-full', className)}>
      <select
        {...props}
        id={props.id || triggerProps.id}
        className={cn(
          'w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          triggerProps.className,
        )}
        value={internal}
        onChange={(e) => setValue(e.target.value)}
        aria-label={props['aria-label'] || triggerProps['aria-label'] || (props.id || triggerProps.id ? undefined : 'Select')}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value ?? option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function SelectTrigger() {
  return null
}
SelectTrigger.displayName = 'SelectTrigger'

export function SelectValue({ placeholder }) {
  return placeholder ? <span className="text-gray-500">{placeholder}</span> : null
}
SelectValue.displayName = 'SelectValue'

export function SelectContent() {
  return null
}
SelectContent.displayName = 'SelectContent'

export function SelectItem({ value, children }) {
  return (
    <option value={value}>
      {children}
    </option>
  )
}
SelectItem.displayName = 'SelectItem'
