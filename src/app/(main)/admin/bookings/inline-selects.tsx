'use client'

import { useTransition, useState } from 'react'

type ServerAction = (fd: FormData) => Promise<void>

interface InlineSelectProps {
  name: string
  defaultValue: string | number
  options: { value: string | number; label: string }[]
  hiddenFields: Record<string, string>
  action: ServerAction
  /** value → hex color. Applies tinted bg + border + text color matching the current value. */
  colorMap?: Record<string, string>
  style?: React.CSSProperties
  className?: string
}

export function InlineSelect({
  name,
  defaultValue,
  options,
  hiddenFields,
  action,
  colorMap,
  style,
  className,
}: InlineSelectProps) {
  const [isPending, startTransition] = useTransition()
  const [currentValue, setCurrentValue] = useState(String(defaultValue))

  const color = colorMap?.[currentValue]
  const colorStyle: React.CSSProperties = color
    ? { backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }
    : {}

  return (
    <select
      name={name}
      defaultValue={String(defaultValue)}
      disabled={isPending}
      onChange={e => {
        const val = e.target.value
        setCurrentValue(val)
        startTransition(async () => {
          const fd = new FormData()
          Object.entries(hiddenFields).forEach(([k, v]) => fd.set(k, v))
          fd.set(name, val)
          await action(fd)
        })
      }}
      className={className}
      style={{
        opacity: isPending ? 0.5 : 1,
        cursor: isPending ? 'wait' : undefined,
        ...colorStyle,
        ...style,
      }}
    >
      {options.map(opt => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
