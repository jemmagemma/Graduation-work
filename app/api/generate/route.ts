import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { loadAll, saveLesson, findLesson } from '@/lib/data'
import { runInspection } from '@/lib/inspect'
import { declaredQuestionCount } from '@/lib/questionCount'
import { buildPrompt } from '@/lib/prompt'
import type { Lesson, Question } from '@/lib/types'

const MODEL = 'claude-opus-4-5'

export async function POST(req: Request) {
  const { lessonId, apiKey } = await req.json() as { lessonId: string; apiKey: string }

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 400 })
  }

  const data = loadAll()
  const found = findLesson(data, lessonId)
  if (!found) {
    return NextResponse.json({ error: `レッスン ${lessonId} が見つかりません` }, { status: 404 })
  }
  const { course, lesson } = found

  const approvedLessons = course.lessons.filter(l => l.status === 'approved')
  const { system, user } = buildPrompt(
    data.series.guide,
    course.title,
    course.guide,
    lesson.title,
    lesson.lessonIndex,
    approvedLessons,
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

    // JSON を抽出（コードブロックで包まれた場合も対応）
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('レスポンスからJSONを抽出できませんでした')

    const parsed = JSON.parse(jsonMatch[0]) as { questions: Question[] }
    if (!Array.isArray(parsed.questions)) throw new Error('questionsフィールドがありません')

    const draft: Lesson = {
      ...lesson,
      status: 'draft',
      questions: parsed.questions,
      generationError: null,
    }
    updated = runInspection(
      draft,
      declaredQuestionCount(course.guide, lesson.lessonIndex),
    )
  } catch (e) {
    // 生成失敗：既存の下書きはそのまま残し、エラーだけ記録
    updated = {
      ...lesson,
      generationError: e instanceof Error ? e.message : String(e),
    }
  }

  saveLesson(updated)
  return NextResponse.json(updated)
}
