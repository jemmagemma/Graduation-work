import { notFound } from 'next/navigation'
import { findLesson, loadAll } from '@/lib/data'
import { LessonPlayer } from '@/components/lesson-player'

export const dynamic = 'force-dynamic'

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ lessonId: string }>
}) {
  const { lessonId } = await params
  const found = findLesson(loadAll(), lessonId)
  if (!found) notFound()

  return <LessonPlayer lesson={found.lesson} mode="preview" />
}
