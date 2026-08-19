import { eq } from 'drizzle-orm'
import { db } from './db'
import { series, courses, lessons, questions } from './db/schema'
import type { SeriesGuide, CourseGuide, Lesson, DrillData, Question } from './types'

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

// ── Public API（既存の呼び出し元と同じシグネチャ）─────────────

export function loadAll(): DrillData {
  const [ser] = db.select().from(series).all()
  const [crs] = db.select().from(courses).where(eq(courses.seriesId, ser.id)).all()
  const lessonRows = db.select().from(lessons).where(eq(lessons.courseId, crs.id)).all()
  const questionRows = db.select().from(questions).all()

  const questionsByLesson = new Map<string, (typeof questions.$inferSelect)[]>()
  for (const q of questionRows) {
    const arr = questionsByLesson.get(q.lessonId) ?? []
    arr.push(q)
    questionsByLesson.set(q.lessonId, arr)
  }

  return {
    series: {
      id:    ser.id,
      title: ser.title,
      guide: JSON.parse(ser.guide) as SeriesGuide,
    },
    course: {
      id:    crs.id,
      title: crs.title,
      guide: JSON.parse(crs.guide) as CourseGuide,
    },
    lessons: lessonRows
      .sort((a, b) => a.lessonIndex - b.lessonIndex)
      .map(row => rowToLesson(row, questionsByLesson.get(row.id) ?? [])),
  }
}

export function saveSeriesGuide(guide: SeriesGuide): void {
  const [ser] = db.select().from(series).all()
  db.update(series)
    .set({ guide: JSON.stringify(guide) })
    .where(eq(series.id, ser.id))
    .run()
}

export function saveCourseGuide(guide: CourseGuide): void {
  const [crs] = db.select().from(courses).all()
  db.update(courses)
    .set({ guide: JSON.stringify(guide) })
    .where(eq(courses.id, crs.id))
    .run()
}

export function loadLesson(id: string): Lesson {
  const [row] = db.select().from(lessons).where(eq(lessons.id, id)).all()
  if (!row) throw new Error(`レッスン ${id} が見つかりません`)
  const qs = db.select().from(questions).where(eq(questions.lessonId, id)).all()
  return rowToLesson(row, qs)
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
