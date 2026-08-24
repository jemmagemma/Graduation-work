import { notFound } from 'next/navigation'
import { loadAll } from '@/lib/data'
import { approvedLessons, nextApprovedLesson } from '@/lib/drill'
import { LessonPlayer } from '@/components/lesson-player'

export default async function DrillLessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>
}) {
  const { courseId, lessonId } = await params
  const data = loadAll()
  const course = data.courses.find(c => c.id === courseId)
  if (!course) notFound()

  const lesson = approvedLessons(course).find(l => l.id === lessonId)
  if (!lesson) notFound()

  const next = nextApprovedLesson(course, lessonId)

  return (
    <LessonPlayer
      key={lesson.id}
      lesson={lesson}
      mode="drill"
      courseId={course.id}
      nextLesson={next ? { id: next.id, title: next.title } : null}
    />
  )
}
