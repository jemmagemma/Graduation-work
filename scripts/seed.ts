/**
 * JSON ファイル（data/kakuto-tpo/）の既存データを SQLite に移行するシードスクリプト。
 * 冪等：既存レコードを削除して再投入するため、何度でも実行できる。
 *
 * 実行方法: pnpm seed
 */
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

import * as schema from '../lib/db/schema'
import type { SeriesGuide, CourseGuide, Lesson } from '../lib/types'

// ── DB 接続 ──────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'data', 'app.db')
const sqlite  = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

// ── JSON 読み込みヘルパー ─────────────────────────────────────
function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as T
}

const ROOT        = path.join(process.cwd(), 'data', 'kakuto-tpo')
const SERIES_PATH = path.join(ROOT, 'series.json')
const COURSE_PATH = path.join(ROOT, 'kimono-kaku', 'course.json')
const LESSONS_DIR = path.join(ROOT, 'kimono-kaku', 'lessons')

// ── テーブル作成（push の代わりに DDL を直接実行）───────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS series (
    id    TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    guide TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS courses (
    id        TEXT PRIMARY KEY,
    series_id TEXT NOT NULL REFERENCES series(id),
    title     TEXT NOT NULL,
    guide     TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id                TEXT PRIMARY KEY,
    course_id         TEXT NOT NULL REFERENCES courses(id),
    title             TEXT NOT NULL,
    lesson_index      INTEGER NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    inspection_status TEXT NOT NULL DEFAULT 'pending',
    inspection_errors TEXT NOT NULL DEFAULT '[]',
    generation_error  TEXT
  );
  CREATE TABLE IF NOT EXISTS questions (
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

// ── 既存データを削除して再投入（冪等）──────────────────────────
sqlite.exec(`
  DELETE FROM questions;
  DELETE FROM lessons;
  DELETE FROM courses;
  DELETE FROM series;
`)

// ── シリーズ ──────────────────────────────────────────────────
const seriesJson = readJson<{ id: string; title: string; guide: SeriesGuide }>(SERIES_PATH)
db.insert(schema.series).values({
  id:    seriesJson.id,
  title: seriesJson.title,
  guide: JSON.stringify(seriesJson.guide),
}).run()
console.log(`✓ series: ${seriesJson.id}`)

// ── コース ────────────────────────────────────────────────────
const courseJson = readJson<{ id: string; title: string; guide: CourseGuide }>(COURSE_PATH)
db.insert(schema.courses).values({
  id:       courseJson.id,
  seriesId: seriesJson.id,
  title:    courseJson.title,
  guide:    JSON.stringify(courseJson.guide),
}).run()
console.log(`✓ course: ${courseJson.id}`)

// ── レッスン + 設問 ───────────────────────────────────────────
const lessonFiles = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.json')).sort()

for (const file of lessonFiles) {
  const lesson = readJson<Lesson>(path.join(LESSONS_DIR, file))

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

  console.log(`✓ lesson: ${lesson.id}（${lesson.questions.length}問）`)
}

console.log('\nシード完了 →', DB_PATH)
sqlite.close()
