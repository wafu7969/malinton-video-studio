/**
 * Inline SVG icons. Kept local and dependency-free so the published package
 * carries no icon library.
 */

interface IconProps {
  size?: number
  className?: string
}

function Base({
  size = 16,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function PlayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    </Base>
  )
}

export function PrevIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon points="19 5 8 12 19 19 19 5" fill="currentColor" stroke="none" />
      <line x1="5" y1="5" x2="5" y2="19" />
    </Base>
  )
}

export function NextIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon points="5 5 16 12 5 19 5 5" fill="currentColor" stroke="none" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </Base>
  )
}

export function ReplayIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 9 8 9" />
    </Base>
  )
}

export function ReloadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 4 21 9 16 9" />
    </Base>
  )
}

export function VolumeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon
        points="4 9 8 9 13 5 13 19 8 15 4 15 4 9"
        fill="currentColor"
        stroke="none"
      />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </Base>
  )
}

export function MuteIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polygon
        points="4 9 8 9 13 5 13 19 8 15 4 15 4 9"
        fill="currentColor"
        stroke="none"
      />
      <line x1="17" y1="9" x2="22" y2="15" />
      <line x1="22" y1="9" x2="17" y2="15" />
    </Base>
  )
}
