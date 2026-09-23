interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible label; the visible text lives next to the switch. */
  label: string
  id?: string
  /** Renders the switch greyed out and removes it from the tab order. */
  disabled?: boolean
}

/** The pill toggle used for the mute control. */
export function Switch({ checked, onChange, label, id, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`mvs-switch${checked ? ' is-on' : ''}${
        disabled ? ' is-disabled' : ''
      }`}
      onClick={() => onChange(!checked)}
    >
      <span className="mvs-switch__thumb" />
    </button>
  )
}
