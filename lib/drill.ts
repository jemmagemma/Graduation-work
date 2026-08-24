import type { Course, Lesson } from './types'

export const DRILL_CATCH = '売場の新たな仲間へ。クイズで、品目の格とTPOの初手を身につける。'

export function approvedLessons(course: Course): Lesson[] {
  return course.lessons.filter(l => l.status === 'approved' && l.questions.length > 0)
}

export function isCourseOpen(course: Course): boolean {
  return approvedLessons(course).length > 0
}

export function nextApprovedLesson(course: Course, lessonId: string): Lesson | null {
  const open = approvedLessons(course)
  const i = open.findIndex(l => l.id === lessonId)
  if (i < 0 || i + 1 >= open.length) return null
  return open[i + 1]
}
