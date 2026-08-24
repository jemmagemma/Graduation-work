import type { ReactNode } from 'react'

export function DrillShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-studio-canvas flex flex-col font-sans">
      <header className="h-7 shrink-0 flex items-center justify-center border-b border-studio-title bg-studio-title">
        <span className="text-[11px] font-medium tracking-wide text-white">令和きもの販売員ドリル</span>
      </header>
      {children}
    </div>
  )
}
