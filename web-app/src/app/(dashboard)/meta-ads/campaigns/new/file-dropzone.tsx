'use client'

import { useRef, useState } from 'react'

export function FileDropzone({
  id,
  name,
  accept,
  required,
  fileName,
  onFile,
  hint,
}: {
  id: string
  name?: string
  accept: string
  required?: boolean
  fileName: string | null
  onFile: (file: File) => void
  hint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        // Reflejar el drop en el input nativo para que un submit por `name`
        // (caso imagen) también lo mande, no solo el callback `onFile`.
        if (inputRef.current) inputRef.current.files = e.dataTransfer.files
        handleFiles(e.dataTransfer.files)
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-6 text-center transition-colors duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        dragOver ? 'border-accent bg-accent/[0.08]' : 'border-border-2 bg-surface-2 hover:border-accent/50'
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-3"
      >
        <path d="M12 3v12M12 3l-4 4M12 3l4 4" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
      <p className="text-[13px] text-text">
        {fileName ? (
          <span className="font-semibold text-text">{fileName}</span>
        ) : (
          <>
            <span className="font-semibold text-accent">Hacé clic</span> o arrastrá el archivo acá
          </>
        )}
      </p>
      {hint && <p className="text-[11px] text-text-3">{hint}</p>}
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  )
}
