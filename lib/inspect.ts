import type { Question, Lesson, InspectionResult } from './types'

const FORBIDDEN = [
  'フォーマル度', 'ドレスコード', 'ランク', 'レベル',
  '格式', 'ステータス', '燕尾服', 'タキシード', 'カクテルドレス',
]

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter(w => text.includes(w))
}

/** 正解だけが明らかに長いと、長さで当たる */
const CHOICE_LEN_GAP = 8

function checkChoiceLength(
  errors: string[],
  label: string,
  choices: string[],
  correct: number,
): void {
  const correctLen = [...choices[correct]].length
  const otherMax = Math.max(
    ...choices.filter((_, i) => i !== correct).map(c => [...c].length),
  )
  if (correctLen - otherMax >= CHOICE_LEN_GAP) {
    errors.push(
      `${label}: 正解の選択肢が他より${correctLen - otherMax}文字長い（長さで当たる）`,
    )
  }
}

export function inspect(
  questions: Question[],
  expectedCount: number | null,
): InspectionResult {
  const errors: string[] = []

  if (expectedCount === null) {
    errors.push('コースガイドにこのレッスンの問数が宣言されていません')
  } else if (questions.length !== expectedCount) {
    errors.push(
      `設問数が ${questions.length} 問です（ガイド宣言は ${expectedCount} 問）`,
    )
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
      else if (q.choices?.length === 4)
        checkChoiceLength(errors, label, q.choices, q.correct)
    } else if (q.qType === 'true_false') {
      if (typeof q.answer !== 'boolean')
        errors.push(`${label}: 正解（○×）が true / false ではありません`)
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

export function runInspection(
  lesson: Lesson,
  expectedCount: number | null,
): Lesson {
  const result = inspect(lesson.questions, expectedCount)
  return { ...lesson, inspection: result }
}
