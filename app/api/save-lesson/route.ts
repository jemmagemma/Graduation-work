import { NextResponse } from 'next/server'
import { loadLesson, saveLesson } from '@/lib/data'
import { runInspection } from '@/lib/inspect'
import type { Question } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const { lessonId, questions } = await req.json() as {
      lessonId: string
      questions: Question[]
    }
    const lesson = loadLesson(lessonId)
    const updated = runInspection({ ...lesson, questions })
    saveLesson(updated)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
