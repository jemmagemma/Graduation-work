import type { CourseGuide } from './types'

export function declaredQuestionCount(
  guide: CourseGuide,
  lessonIndex: number,
): number | null {
  const n = guide.question_counts?.[lessonIndex]
  if (!Number.isInteger(n) || n < 1) return null
  return n
}

export function parseQuestionCounts(raw: string): number[] {
  return raw
    .split(/[,、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => Number(s))
    .filter(n => Number.isInteger(n) && n >= 1)
}

export function formatQuestionCounts(counts: number[] | undefined): string {
  return (counts ?? []).join(', ')
}
