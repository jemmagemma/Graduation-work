export type LessonStatus = 'pending' | 'draft' | 'approved'
export type InspectionStatus = 'pending' | 'pass' | 'fail'
export type QuestionType = 'four_choice' | 'true_false'

export interface SeriesGuide {
  purpose: string
  terms: string
  aux_concept: string
  forbidden_synonyms: string
  /** 1行が1グループ。正表記 ← 別名, 別名 */
  canonical_terms: string
  /** この文字列は丸ごと置換しない。読点区切り */
  rewrite_exclusions: string
  exceptions: string
  writing_style: string
}

export interface CourseGuide {
  lesson_roles: string
  must_include: string
  revisit: string
  exclude: string
  completion: string
  /** レッスン順の設問数。8問固定ではない。未宣言の回は検査不合格 */
  question_counts: number[]
}

export interface Question {
  id: number
  qType: QuestionType
  text: string
  choices?: string[]  // four_choice only (4 items)
  correct?: number    // four_choice only (0-indexed)
  answer?: boolean    // true_false only
  explanation: string
}

export interface InspectionResult {
  status: InspectionStatus
  errors: string[]
}

export interface Lesson {
  id: string
  title: string
  lessonIndex: number
  status: LessonStatus
  inspection: InspectionResult
  generationError: string | null
  questions: Question[]
}

export interface Course {
  id: string
  title: string
  courseIndex: number
  guide: CourseGuide
  lessons: Lesson[]
}

export interface DrillData {
  series: { id: string; title: string; guide: SeriesGuide }
  courses: Course[]
}
