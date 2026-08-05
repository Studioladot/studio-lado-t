'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { SunIcon, MoonIcon } from './nav-icons'
import { THEME_STORAGE_KEY } from '@/lib/theme-storage-key'

const THEME_CHANGE_EVENT = 'gotix-theme-change'

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback)
}

function getSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
}

function getServerSnapshot() {
  return false
}

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleTheme = useCallback(() => {
    const next = window.localStorage.getItem(THEME_STORAGE_KEY) !== 'dark'
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={collapsed ? (isDark ? 'Modo noche' : 'Modo día') : undefined}
      className={`mb-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] py-2 text-white/60 outline-none transition-colors duration-200 ease-out hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50 ${
        collapsed ? 'px-0' : 'px-3'
      }`}
    >
      {isDark ? <MoonIcon size={13} /> : <SunIcon size={13} />}
      {!collapsed && <span className="text-xs font-semibold">{isDark ? 'Modo noche' : 'Modo día'}</span>}
    </button>
  )
}
