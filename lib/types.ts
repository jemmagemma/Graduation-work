export type LessonStatus = 'pending' | 'draft' | 'approved'
export type InspectionStatus = 'pending' | 'pass' | 'fail'
export type QuestionType = 'four_choice' | 'true_false'

export interface SeriesGuide {
  purpose: string
  terms: string
  aux_concept: string
  forbidden_synonyms: string
  exceptions: string
  writing_style: string
}

export interface CourseGuide {
  lesson_roles: string
  must_include: string
  revisit: string
  exclude: string
  completion: string
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

export interface DrillData {
  series: { id: string; title: string; guide: SeriesGuide }
  course: { id: string; title: string; guide: CourseGuide }
  lessons: Lesson[]
}
