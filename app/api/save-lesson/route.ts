import { NextResponse } from 'next/server'
import { loadAll, findLesson, saveLesson } from '@/lib/data'
import { runInspection } from '@/lib/inspect'
import { declaredQuestionCount } from '@/lib/questionCount'
import type { Question } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const { lessonId, questions } = await req.json() as {
      lessonId: string
      questions: Question[]
    }
    const found = findLesson(loadAll(), lessonId)
    if (!found) throw new Error(`レッスン ${lessonId} が見つかりません`)
    const { course, lesson } = found
    const updated = runInspection({
      ...lesson,
      questions,
      status: lesson.status === 'approved' ? 'approved' : 'draft',
    }, declaredQuestionCount(course.guide, lesson.lessonIndex))
    saveLesson(updated)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
