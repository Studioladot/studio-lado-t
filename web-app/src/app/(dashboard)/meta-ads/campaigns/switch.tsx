// Toggle pill compartido — mismo tamaño/comportamiento que `.meta-switch` en
// app.html:396-399 (30x16px, thumb que se desliza, verde cuando está "on").

export function Switch({
  on,
  disabled,
  type = 'button',
  onClick,
  className,
  ariaLabel,
}: {
  on: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-4 w-[30px] shrink-0 rounded-full border outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? 'border-green bg-green/[0.15]' : 'border-border bg-surface-2'
      } ${className ?? ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full transition-transform duration-150 ease-out ${
          on ? 'translate-x-[14px] bg-green' : 'translate-x-0 bg-text-3'
        }`}
      />
    </button>
  )
}
