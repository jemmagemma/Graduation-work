import { eq } from 'drizzle-orm'
import { db } from './db'
import { series, courses, lessons, questions } from './db/schema'
import type { SeriesGuide, CourseGuide, Lesson, DrillData, Question, Course } from './types'

// ── 内部変換ヘルパー ──────────────────────────────────────────

function rowToLesson(
  row: typeof lessons.$inferSelect,
  qs:  (typeof questions.$inferSelect)[],
): Lesson {
  return {
    id:          row.id,
    title:       row.title,
    lessonIndex: row.lessonIndex,
    status:      row.status as Lesson['status'],
    inspection:  {
      status: row.inspectionStatus as Lesson['inspection']['status'],
      errors: JSON.parse(row.inspectionErrors) as string[],
    },
    generationError: row.generationError ?? null,
    questions: qs
      .sort((a, b) => a.questionOrder - b.questionOrder)
      .map<Question>(q => ({
        id:          q.questionOrder,
        qType:       q.qType as Question['qType'],
        text:        q.text,
        choices:     q.choices ? (JSON.parse(q.choices) as string[]) : undefined,
        correct:     q.correct ?? undefined,
        answer:      q.answer === null ? undefined : q.answer === 1,
        explanation: q.explanation,
      })),
  }
}

// ── Public API ─────────────────────────────────────────────

export function loadAll(): DrillData {
  const [ser] = db.select().from(series).all()
  const courseRows = db.select().from(courses).where(eq(courses.seriesId, ser.id)).all()
  const lessonRows = db.select().from(lessons).all()
  const questionRows = db.select().from(questions).all()

  const questionsByLesson = new Map<string, (typeof questions.$inferSelect)[]>()
  for (const q of questionRows) {
    const arr = questionsByLesson.get(q.lessonId) ?? []
    arr.push(q)
    questionsByLesson.set(q.lessonId, arr)
  }

  const lessonsByCourse = new Map<string, Lesson[]>()
  for (const row of lessonRows) {
    const arr = lessonsByCourse.get(row.courseId) ?? []
    arr.push(rowToLesson(row, questionsByLesson.get(row.id) ?? []))
    lessonsByCourse.set(row.courseId, arr)
  }

  return {
    series: {
      id:    ser.id,
      title: ser.title,
      guide: JSON.parse(ser.guide) as SeriesGuide,
    },
    courses: courseRows
      .sort((a, b) => a.courseIndex - b.courseIndex)
      .map<Course>(row => ({
        id:          row.id,
        title:       row.title,
        courseIndex: row.courseIndex,
        guide:       JSON.parse(row.guide) as CourseGuide,
        lessons:     (lessonsByCourse.get(row.id) ?? [])
          .sort((a, b) => a.lessonIndex - b.lessonIndex),
      })),
  }
}

export function saveSeriesGuide(guide: SeriesGuide): void {
  const [ser] = db.select().from(series).all()
  db.update(series)
    .set({ guide: JSON.stringify(guide) })
    .where(eq(series.id, ser.id))
    .run()
}

export function saveCourseGuide(courseId: string, guide: CourseGuide): void {
  db.update(courses)
    .set({ guide: JSON.stringify(guide) })
    .where(eq(courses.id, courseId))
    .run()
}

export function loadLesson(id: string): Lesson {
  const [row] = db.select().from(lessons).where(eq(lessons.id, id)).all()
  if (!row) throw new Error(`レッスン ${id} が見つかりません`)
  const qs = db.select().from(questions).where(eq(questions.lessonId, id)).all()
  return rowToLesson(row, qs)
}

export function findLesson(
  data: DrillData,
  lessonId: string,
): { course: Course; lesson: Lesson } | null {
  for (const course of data.courses) {
    const lesson = course.lessons.find(l => l.id === lessonId)
    if (lesson) return { course, lesson }
  }
  return null
}

export function saveLesson(lesson: Lesson): void {
  db.update(lessons)
    .set({
      status:           lesson.status,
      inspectionStatus: lesson.inspection.status,
      inspectionErrors: JSON.stringify(lesson.inspection.errors),
      generationError:  lesson.generationError ?? null,
    })
    .where(eq(lessons.id, lesson.id))
    .run()

  db.delete(questions).where(eq(questions.lessonId, lesson.id)).run()

  for (const q of lesson.questions) {
    db.insert(questions).values({
      lessonId:      lesson.id,
      questionOrder: q.id,
      qType:         q.qType,
      text:          q.text,
      choices:       q.choices ? JSON.stringify(q.choices) : null,
      correct:       q.correct ?? null,
      answer:        q.answer === undefined ? null : (q.answer ? 1 : 0),
      explanation:   q.explanation,
    }).run()
  }
}
