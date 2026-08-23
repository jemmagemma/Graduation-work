import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { loadAll, saveLesson, findLesson } from '@/lib/data'
import { inspectQuestion, runInspection } from '@/lib/inspect'
import { declaredQuestionCount } from '@/lib/questionCount'
import { buildPrompt } from '@/lib/prompt'
import type { Lesson, Question } from '@/lib/types'

const MODEL = 'claude-opus-4-5'

function mergeReplacements(
  existing: Question[],
  replacements: Question[],
  failedIds: number[],
): Question[] {
  const byId = new Map(replacements.map(q => [q.id, q]))
  if (failedIds.every(id => byId.has(id))) {
    return existing.map(q => byId.get(q.id) ?? q)
  }
  if (replacements.length === failedIds.length) {
    return existing.map(q => {
      const pos = failedIds.indexOf(q.id)
      return pos >= 0 ? { ...replacements[pos], id: q.id } : q
    })
  }
  throw new Error('不合格設問の再生成結果を既存の設問に割り当てられませんでした')
}

export async function POST(req: Request) {
  const { lessonId, apiKey, scope } = await req.json() as {
    lessonId: string
    apiKey: string
    scope?: 'all' | 'failed'
  }

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 400 })
  }

  const data = loadAll()
  const found = findLesson(data, lessonId)
  if (!found) {
    return NextResponse.json({ error: `レッスン ${lessonId} が見つかりません` }, { status: 404 })
  }
  const { course, lesson } = found

  const replaceFailed = scope === 'failed'
    ? (() => {
        const failed = lesson.questions
          .map((question, i) => ({ question, errors: inspectQuestion(question, i) }))
          .filter(row => row.errors.length > 0)
        const keep = lesson.questions.filter(q => !failed.some(f => f.question.id === q.id))
        return { keep, failed }
      })()
    : undefined

  if (scope === 'failed' && (!replaceFailed || replaceFailed.failed.length === 0)) {
    return NextResponse.json(
      { error: '検査不合格の設問がありません。全体を再生成してください。' },
      { status: 400 },
    )
  }

  const approvedLessons = course.lessons.filter(l => l.status === 'approved')
  const { system, user } = buildPrompt(
    data.series.guide,
    course.title,
    course.guide,
    lesson.title,
    lesson.lessonIndex,
    approvedLessons,
    replaceFailed,
  )

  let updated: Lesson
  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('レスポンスからJSONを抽出できませんでした')

    const parsed = JSON.parse(jsonMatch[0]) as { questions: Question[] }
    if (!Array.isArray(parsed.questions)) throw new Error('questionsフィールドがありません')

    const questions = replaceFailed
      ? mergeReplacements(
          lesson.questions,
          parsed.questions,
          replaceFailed.failed.map(f => f.question.id),
        )
      : parsed.questions

    const draft: Lesson = {
      ...lesson,
      status: 'draft',
      questions,
      generationError: null,
    }
    updated = runInspection(
      draft,
      declaredQuestionCount(course.guide, lesson.lessonIndex),
    )
  } catch (e) {
    updated = {
      ...lesson,
      generationError: e instanceof Error ? e.message : String(e),
    }
  }

  saveLesson(updated)
  return NextResponse.json(updated)
}
