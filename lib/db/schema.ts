import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const series = sqliteTable('series', {
  id:    text('id').primaryKey(),
  title: text('title').notNull(),
  guide: text('guide').notNull(), // JSON: SeriesGuide
})

export const courses = sqliteTable('courses', {
  id:       text('id').primaryKey(),
  seriesId: text('series_id').notNull().references(() => series.id),
  title:    text('title').notNull(),
  guide:    text('guide').notNull(), // JSON: CourseGuide
})

export const lessons = sqliteTable('lessons', {
  id:               text('id').primaryKey(),
  courseId:         text('course_id').notNull().references(() => courses.id),
  title:            text('title').notNull(),
  lessonIndex:      integer('lesson_index').notNull(),
  status:           text('status').notNull().default('pending'),
  inspectionStatus: text('inspection_status').notNull().default('pending'),
  inspectionErrors: text('inspection_errors').notNull().default('[]'), // JSON: string[]
  generationError:  text('generation_error'),
})

export const questions = sqliteTable('questions', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  lessonId:      text('lesson_id').notNull().references(() => lessons.id),
  questionOrder: integer('question_order').notNull(),
  qType:         text('q_type').notNull(),
  text:          text('text').notNull(),
  choices:       text('choices'),       // JSON: string[] | null
  correct:       integer('correct'),    // four_choice: 0-indexed | null
  answer:        integer('answer'),     // true_false: 1=true, 0=false | null
  explanation:   text('explanation').notNull(),
})
