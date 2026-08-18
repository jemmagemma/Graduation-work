import { NextResponse } from 'next/server'
import { saveSeriesGuide, saveCourseGuide } from '@/lib/data'
import type { SeriesGuide, CourseGuide } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json() as
      | { type: 'series'; guide: SeriesGuide }
      | { type: 'course'; guide: CourseGuide }

    if (body.type === 'series') {
      saveSeriesGuide(body.guide)
    } else {
      saveCourseGuide(body.guide)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
