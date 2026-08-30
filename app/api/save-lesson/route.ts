import { NextResponse } from 'next/server'
import { loadAll, findLesson, saveLesson } from '@/lib/data'
import { runInspection } from '@/lib/inspect'
import { declaredQuestionCount } from '@/lib/questionCount'
import { rewriteQuestions } from '@/lib/canonicalTerms'
import type { Question } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const { lessonId, questions } = await req.json() as {
      lessonId: string
      questions: Question[]
    }
    const data = loadAll()
    const found = findLesson(data, lessonId)
    if (!found) throw new Error(`レッスン ${lessonId} が見つかりません`)
    const { course, lesson } = found
    const { questions: rewritten, report } = rewriteQuestions(questions, data.series.guide)
    const updated = runInspection({
      ...lesson,
      questions: rewritten,
      status: lesson.status === 'approved' ? 'approved' : 'draft',
    }, declaredQuestionCount(course.guide, lesson.lessonIndex))
    saveLesson(updated)
    return NextResponse.json({ ...updated, canonicalRewrite: report })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
