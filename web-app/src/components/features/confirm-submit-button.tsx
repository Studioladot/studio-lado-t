'use client'

import { useFormStatus } from 'react-dom'

export function ConfirmSubmitButton({
  confirmMessage,
  children,
  className,
}: {
  confirmMessage: string
  children: React.ReactNode
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault()
        }
      }}
    >
      {children}
    </button>
  )
}
