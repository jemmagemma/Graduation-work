/**
 * JSON ファイル（data/kakuto-tpo/）の既存データを SQLite に移行するシードスクリプト。
 * 冪等：既存レコードを削除して再投入するため、何度でも実行できる。
 *
 * 実行方法: pnpm seed
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import fs from 'fs'
import path from 'path'

import * as schema from '../lib/db/schema'
import type { SeriesGuide, CourseGuide, Lesson } from '../lib/types'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')
const sqlite  = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = OFF')
const db = drizzle(sqlite, { schema })

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T
}

const ROOT        = path.join(process.cwd(), 'data', 'kakuto-tpo')
const SERIES_PATH = path.join(ROOT, 'series.json')
const COURSES_DIR = path.join(ROOT, 'courses')

sqlite.exec(`
  DROP TABLE IF EXISTS questions;
  DROP TABLE IF EXISTS lessons;
  DROP TABLE IF EXISTS courses;
  DROP TABLE IF EXISTS series;
`)
sqlite.pragma('foreign_keys = ON')

sqlite.exec(`
  CREATE TABLE series (
    id    TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    guide TEXT NOT NULL
  );
  CREATE TABLE courses (
    id           TEXT PRIMARY KEY,
    series_id    TEXT NOT NULL REFERENCES series(id),
    title        TEXT NOT NULL,
    course_index INTEGER NOT NULL DEFAULT 0,
    guide        TEXT NOT NULL
  );
  CREATE TABLE lessons (
    id                TEXT PRIMARY KEY,
    course_id         TEXT NOT NULL REFERENCES courses(id),
    title             TEXT NOT NULL,
    lesson_index      INTEGER NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    inspection_status TEXT NOT NULL DEFAULT 'pending',
    inspection_errors TEXT NOT NULL DEFAULT '[]',
    generation_error  TEXT
  );
  CREATE TABLE questions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id      TEXT NOT NULL REFERENCES lessons(id),
    question_order INTEGER NOT NULL,
    q_type         TEXT NOT NULL,
    text           TEXT NOT NULL,
    choices        TEXT,
    correct        INTEGER,
    answer         INTEGER,
    explanation    TEXT NOT NULL
  );
`)

const seriesJson = readJson<{ id: string; title: string; guide: SeriesGuide }>(SERIES_PATH)
db.insert(schema.series).values({
  id:    seriesJson.id,
  title: seriesJson.title,
  guide: JSON.stringify(seriesJson.guide),
}).run()
console.log(`✓ series: ${seriesJson.id}`)

const courseDirs = fs.readdirSync(COURSES_DIR)
  .filter(name => fs.statSync(path.join(COURSES_DIR, name)).isDirectory())
  .sort()

for (const dir of courseDirs) {
  const coursePath = path.join(COURSES_DIR, dir, 'course.json')
  const courseJson = readJson<{
    id: string
    title: string
    courseIndex: number
    guide: CourseGuide
  }>(coursePath)

  db.insert(schema.courses).values({
    id:          courseJson.id,
    seriesId:    seriesJson.id,
    title:       courseJson.title,
    courseIndex: courseJson.courseIndex,
    guide:       JSON.stringify(courseJson.guide),
  }).run()
  console.log(`✓ course: ${courseJson.id}`)

  const lessonsDir = path.join(COURSES_DIR, dir, 'lessons')
  if (!fs.existsSync(lessonsDir)) continue

  const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.json')).sort()
  for (const file of lessonFiles) {
    const lesson = readJson<Lesson>(path.join(lessonsDir, file))

    db.insert(schema.lessons).values({
      id:               lesson.id,
      courseId:         courseJson.id,
      title:            lesson.title,
      lessonIndex:      lesson.lessonIndex,
      status:           lesson.status,
      inspectionStatus: lesson.inspection.status,
      inspectionErrors: JSON.stringify(lesson.inspection.errors),
      generationError:  lesson.generationError ?? null,
    }).run()

    for (const q of lesson.questions) {
      db.insert(schema.questions).values({
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

    console.log(`  ✓ lesson: ${lesson.id}（${lesson.questions.length}問）`)
  }
}

console.log('\nシード完了 →', DB_PATH)
sqlite.close()
