interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible label; the visible text lives next to the switch. */
  label: string
  id?: string
}

/** The pill toggle used for "字幕显示" and "静音". */
export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`mvs-switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="mvs-switch__thumb" />
    </button>
  )
}
