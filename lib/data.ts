import path from 'path'
import fs from 'fs'
import type { SeriesGuide, CourseGuide, Lesson, DrillData } from './types'

const ROOT = path.join(process.cwd(), 'data', 'kakuto-tpo')
const SERIES_PATH  = path.join(ROOT, 'series.json')
const COURSE_PATH  = path.join(ROOT, 'kimono-kaku', 'course.json')
const LESSONS_DIR  = path.join(ROOT, 'kimono-kaku', 'lessons')

function read<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T
}
function write(p: string, data: unknown): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

export function loadAll(): DrillData {
  const series = read<{ id: string; title: string; guide: SeriesGuide }>(SERIES_PATH)
  const course  = read<{ id: string; title: string; guide: CourseGuide }>(COURSE_PATH)
  const files   = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.json')).sort()
  const lessons = files.map(f => read<Lesson>(path.join(LESSONS_DIR, f)))
  return { series, course, lessons }
}

export function saveSeriesGuide(guide: SeriesGuide): void {
  const current = read<{ id: string; title: string; guide: SeriesGuide }>(SERIES_PATH)
  write(SERIES_PATH, { ...current, guide })
}

export function saveCourseGuide(guide: CourseGuide): void {
  const current = read<{ id: string; title: string; guide: CourseGuide }>(COURSE_PATH)
  write(COURSE_PATH, { ...current, guide })
}

export function saveLesson(lesson: Lesson): void {
  write(path.join(LESSONS_DIR, `${lesson.id}.json`), lesson)
}

export function loadLesson(id: string): Lesson {
  return read<Lesson>(path.join(LESSONS_DIR, `${id}.json`))
}
