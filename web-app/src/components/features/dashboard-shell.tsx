'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { SidebarNav } from './sidebar-nav'

const COLLAPSED_STORAGE_KEY = 'gotix_sidebar_collapsed'
const COLLAPSED_CHANGE_EVENT = 'gotix-sidebar-collapsed-change'

function subscribe(callback: () => void) {
  window.addEventListener(COLLAPSED_CHANGE_EVENT, callback)
  return () => window.removeEventListener(COLLAPSED_CHANGE_EVENT, callback)
}

function getSnapshot() {
  return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
}

function getServerSnapshot() {
  return false
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggleCollapsed = useCallback(() => {
    const next = window.localStorage.getItem(COLLAPSED_STORAGE_KEY) !== '1'
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
    window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT))
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <SidebarNav collapsed={collapsed} onToggle={toggleCollapsed} />
      <div
        className={`transition-[margin] duration-200 ease-out ${collapsed ? 'ml-[64px]' : 'ml-[220px]'}`}
      >
        {children}
      </div>
    </div>
  )
}
