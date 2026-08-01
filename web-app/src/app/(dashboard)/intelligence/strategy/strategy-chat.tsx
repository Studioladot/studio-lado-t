'use client'

import { useEffect, useRef, useState } from 'react'
import { sendStrategyMessageAction, clearStrategyChatAction } from './actions'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

export function StrategyChat({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, role: 'user', content: text }])
    setInput('')
    setSending(true)

    const result = await sendStrategyMessageAction(text)
    setSending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessages((prev) => [...prev, { id: `tmp-reply-${Date.now()}`, role: 'assistant', content: result.reply }])
  }

  async function handleClear() {
    if (!window.confirm('¿Borrar todo el historial de este chat?')) return
    setMessages([])
    await clearStrategyChatAction()
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-xs font-medium text-text-2">Habla con el contexto real de tu cuenta</p>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-medium text-text-3 transition-colors duration-200 ease-out hover:text-red"
          >
            Reiniciar chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-text">Preguntame lo que necesites saber de tu cuenta</p>
            <p className="max-w-[360px] text-xs text-text-2">
              Tengo el contexto real de tus campañas activas, objetivos de CPA/ROAS y guiones ganadores.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-control px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-primary text-white' : 'border border-border bg-surface-2/60 text-text'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-control border border-border bg-surface-2/60 px-3.5 py-2.5 text-sm text-text-3">
                  Pensando…
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-5 pb-2 text-xs text-red">{error}</p>}

      <div className="flex items-center gap-2 border-t border-border p-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Preguntame algo sobre tu cuenta..."
          className="flex-1 rounded-control border border-border bg-surface-2/60 px-3.5 py-2.5 text-sm text-text outline-none transition-all duration-200 ease-out focus:border-accent focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          disabled={sending || !input.trim()}
          onClick={handleSend}
          className="rounded-control bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_16px_var(--primary-glow)] transition-all duration-200 ease-out hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
