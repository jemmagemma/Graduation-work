import Link from 'next/link'
import { loadAll } from '@/lib/data'
import { approvedLessons, DRILL_CATCH, isCourseOpen } from '@/lib/drill'
import { DrillShell } from '@/components/drill-shell'

export default function DrillHomePage() {
  const data = loadAll()

  return (
    <DrillShell>
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <p className="text-[11px] tracking-wide text-studio-muted">令和きもの販売員ドリル</p>
            <h1 className="text-2xl font-bold text-studio-ink">{data.series.title}</h1>
            <p className="text-sm text-studio-muted leading-relaxed">{DRILL_CATCH}</p>
          </div>

          <ol className="space-y-3">
            {data.courses.map((course, i) => {
              const open = isCourseOpen(course)
              const count = approvedLessons(course).length
              const inner = (
                <>
                  <span className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    open ? 'bg-studio-ink text-white' : 'bg-studio-line text-studio-muted'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${open ? 'text-studio-ink' : 'text-studio-muted'}`}>
                      {course.title}
                    </p>
                    <p className="text-[11px] text-studio-muted mt-0.5">
                      {open ? `${count}レッスン` : '準備中'}
                    </p>
                  </div>
                  {open && (
                    <span className="text-[11px] text-studio-ink shrink-0">入る →</span>
                  )}
                </>
              )

              if (!open) {
                return (
                  <li
                    key={course.id}
                    className="flex items-center gap-3 bg-studio-card/70 border border-studio-line rounded-xl px-4 py-3.5 opacity-70"
                  >
                    {inner}
                  </li>
                )
              }

              return (
                <li key={course.id}>
                  <Link
                    href={`/drill/${course.id}`}
                    className="flex items-center gap-3 bg-studio-card border border-studio-line rounded-xl px-4 py-3.5 hover:border-studio-ink hover:shadow-sm transition-colors"
                  >
                    {inner}
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </main>
    </DrillShell>
  )
}
