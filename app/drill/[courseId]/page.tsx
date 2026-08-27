import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadAll } from '@/lib/data'
import { approvedLessons, isCourseOpen } from '@/lib/drill'
import { DrillShell } from '@/components/drill-shell'

export default async function DrillCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const data = loadAll()
  const course = data.courses.find(c => c.id === courseId)
  if (!course) notFound()

  const open = isCourseOpen(course)
  const lessons = approvedLessons(course)

  return (
    <DrillShell>
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-3">
            <Link href="/drill" className="text-[11px] text-studio-muted hover:text-studio-ink">
              ← シリーズに戻る
            </Link>
            <p className="text-[11px] tracking-wide text-studio-muted">
              コース {course.courseIndex + 1}
            </p>
            <h1 className="text-2xl font-bold text-studio-ink">{course.title}</h1>
          </div>

          {!open ? (
            <div className="bg-studio-card border border-studio-line rounded-xl px-5 py-8 text-center">
              <p className="text-sm font-semibold text-studio-ink mb-1">準備中</p>
              <p className="text-[12px] text-studio-muted">このコースはまだ公開していません。</p>
            </div>
          ) : (
            <ol className="space-y-3">
              {lessons.map((lesson, i) => (
                <li key={lesson.id}>
                  <Link
                    href={`/drill/${course.id}/${lesson.id}`}
                    className="flex items-center gap-3 bg-studio-card border border-studio-line rounded-xl px-4 py-3.5 hover:border-studio-ink hover:shadow-sm transition-colors"
                  >
                    <span className="text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-studio-ink text-white">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-studio-ink">{lesson.title}</p>
                      <p className="text-[11px] text-studio-muted mt-0.5">
                        {lesson.questions.length}問
                      </p>
                    </div>
                    <span className="text-[11px] text-studio-ink shrink-0">はじめる →</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </DrillShell>
  )
}
