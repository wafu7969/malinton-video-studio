import type { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  /** Renders the muted "label" styling used for the first chip. */
  tone?: 'default' | 'status'
  className?: string
}

/** A single pill in the preview header. */
export function Chip({ children, tone = 'default', className }: ChipProps) {
  return (
    <span
      className={['mvs-chip', `mvs-chip--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}
