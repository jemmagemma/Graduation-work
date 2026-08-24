import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '令和きもの販売員ドリル',
  description: '品目の格とTPO',
}

export default function DrillLayout({ children }: { children: ReactNode }) {
  return children
}
