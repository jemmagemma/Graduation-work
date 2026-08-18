import { NextResponse } from 'next/server'
import { loadLesson, saveLesson } from '@/lib/data'

export async function POST(req: Request) {
  try {
    const { lessonId } = await req.json() as { lessonId: string }
    const lesson = loadLesson(lessonId)

    if (lesson.inspection.status !== 'pass') {
      return NextResponse.json({ error: '検査が合格していません' }, { status: 400 })
    }

    const updated = { ...lesson, status: 'approved' as const }
    saveLesson(updated)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
