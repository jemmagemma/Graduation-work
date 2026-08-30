import { NextResponse } from 'next/server'
import { saveSeriesGuide, saveCourseGuide, applyCanonicalToAllLessons, loadAll } from '@/lib/data'
import { emptyCanonicalRewriteReport } from '@/lib/canonicalTerms'
import type { SeriesGuide, CourseGuide } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json() as
      | { type: 'series'; guide: SeriesGuide }
      | { type: 'course'; courseId: string; guide: CourseGuide }

    if (body.type === 'series') {
      saveSeriesGuide(body.guide)
      const canonicalRewrite = applyCanonicalToAllLessons(body.guide)
      return NextResponse.json({ ok: true, canonicalRewrite, data: loadAll() })
    }

    saveCourseGuide(body.courseId, body.guide)
    return NextResponse.json({ ok: true, canonicalRewrite: emptyCanonicalRewriteReport() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
