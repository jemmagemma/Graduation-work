import type { Question, Lesson, InspectionResult } from './types'

const FORBIDDEN = [
  'フォーマル度', 'ドレスコード', 'ランク', 'レベル',
  '格式', 'ステータス', '燕尾服', 'タキシード', 'カクテルドレス',
]

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter(w => text.includes(w))
}

export function inspect(questions: Question[]): InspectionResult {
  const errors: string[] = []

  if (questions.length !== 8) {
    errors.push(`設問数が ${questions.length} 問です（8問必要）`)
  }

  questions.forEach((q, i) => {
    const label = `設問${i + 1}`

    if (!q.text?.trim()) errors.push(`${label}: 問題文がありません`)
    if (!q.explanation?.trim()) errors.push(`${label}: 解説がありません`)

    if (q.qType === 'four_choice') {
      if (!q.choices || q.choices.length !== 4)
        errors.push(`${label}: 選択肢が ${q.choices?.length ?? 0} つです（4つ必要）`)
      if (q.correct === undefined || q.correct < 0 || q.correct > 3)
        errors.push(`${label}: 正解インデックスが不正です`)
    } else if (q.qType === 'true_false') {
      if (q.answer === undefined)
        errors.push(`${label}: 正解（○×）が設定されていません`)
    } else {
      errors.push(`${label}: 不明なタイプ "${(q as Question).qType}"`)
    }

    const bad = [
      ...hasForbidden(q.text ?? ''),
      ...hasForbidden(q.explanation ?? ''),
      ...(q.choices ?? []).flatMap(hasForbidden),
    ]
    if (bad.length > 0)
      errors.push(`${label}: 禁止語を含んでいます（${[...new Set(bad)].join('・')}）`)
  })

  return { status: errors.length === 0 ? 'pass' : 'fail', errors }
}

export function runInspection(lesson: Lesson): Lesson {
  const result = inspect(lesson.questions)
  return { ...lesson, inspection: result }
}
