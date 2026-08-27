'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Lesson } from '@/lib/types'

export function LessonPlayer({
  lesson,
  mode,
  courseId,
  nextLesson,
}: {
  lesson: Lesson
  mode: 'preview' | 'drill'
  courseId?: string
  nextLesson?: { id: string; title: string } | null
}) {
  const [current, setCurrent] = useState(0)
  const [answered, setAnswered] = useState<number | boolean | null>(null)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    setCurrent(0)
    setAnswered(null)
    setFinished(false)
  }, [lesson.id])

  const fill = mode === 'drill' ? 'flex-1 min-h-0' : 'min-h-screen'
  const center = mode === 'drill' ? 'flex-1 min-h-0' : 'h-screen'
  const courseHref = courseId ? `/drill/${courseId}` : '/drill'
  const theme = mode === 'drill' ? 'drill-theme' : ''

  function reset() {
    setCurrent(0)
    setAnswered(null)
    setFinished(false)
  }

  if (lesson.questions.length === 0) {
    return (
      <div className={`${theme} ${center} flex items-center justify-center bg-studio-canvas text-studio-muted text-sm text-center px-8`}>
        <div>
          <p className="text-lg font-bold mb-2 text-studio-ink">設問がありません</p>
          <p>先にレッスンを生成してください。</p>
          {mode === 'preview' ? (
            <button onClick={() => window.close()} className="mt-4 text-studio-muted underline text-xs">閉じる</button>
          ) : (
            <Link href={courseHref} className="mt-4 inline-block text-studio-muted underline text-xs">コースに戻る</Link>
          )}
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className={`${theme} ${center} flex items-center justify-center bg-studio-canvas text-center px-8`}>
        <div className="bg-studio-card rounded-2xl shadow-sm p-10 max-w-sm w-full">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-lg font-bold text-studio-ink mb-2">レッスン完了</h2>
          <p className="text-sm text-studio-muted mb-6">
            {lesson.title} — {lesson.questions.length} 問を解きました
          </p>
          {mode === 'preview' && (
            <p className="text-[11px] text-studio-muted mb-6">（プレビューのため点数は保存されません）</p>
          )}
          <div className="flex flex-col gap-3">
            {mode === 'drill' && nextLesson && courseId && (
              <Link
                href={`/drill/${courseId}/${nextLesson.id}`}
                className="bg-studio-ink text-white text-sm px-5 py-2 rounded-lg hover:bg-studio-ink-hover"
              >
                次のレッスンへ
              </Link>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="border border-studio-line text-studio-ink text-sm px-5 py-2 rounded-lg hover:bg-studio-canvas"
              >
                もう一度
              </button>
              {mode === 'preview' ? (
                <button
                  onClick={() => window.close()}
                  className="bg-studio-ink text-white text-sm px-5 py-2 rounded-lg hover:bg-studio-ink-hover"
                >
                  閉じる
                </button>
              ) : (
                <Link
                  href={courseHref}
                  className="bg-studio-ink text-white text-sm px-5 py-2 rounded-lg hover:bg-studio-ink-hover"
                >
                  コースに戻る
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const q = lesson.questions[current]
  const total = lesson.questions.length
  const progress = (current / total) * 100
  const isCorrect = answered !== null && (
    q.qType === 'four_choice' ? answered === q.correct : answered === q.answer
  )

  return (
    <div className={`${theme} ${fill} bg-studio-canvas flex flex-col font-sans`}>
      <header className="bg-studio-card border-b border-studio-line px-6 py-3 flex items-center gap-4 shrink-0">
        <div>
          <span className="text-[10px] text-studio-muted tracking-wide">
            {mode === 'preview' ? '令和きもの販売員ドリル · プレビュー' : '令和きもの販売員ドリル'}
          </span>
          <h1 className="text-sm font-bold text-studio-ink leading-tight">{lesson.title}</h1>
        </div>
        <div className="flex-1">
          <div className="h-1.5 bg-studio-line rounded-full overflow-hidden">
            <div
              className="h-full bg-studio-title rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-studio-muted shrink-0">
          {current + 1} / {total}
        </span>
        {mode === 'preview' ? (
          <button onClick={() => window.close()} className="text-[11px] text-studio-muted hover:text-studio-ink ml-2">
            ✕ 閉じる
          </button>
        ) : (
          <Link href={courseHref} className="text-[11px] text-studio-muted hover:text-studio-ink ml-2">
            ← コースへ
          </Link>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="bg-studio-card rounded-2xl shadow-sm p-8 max-w-2xl w-full space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-studio-muted font-mono">問 {current + 1}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              q.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {q.qType === 'four_choice' ? '四択' : '○×'}
            </span>
          </div>

          <p className="text-base font-semibold text-studio-ink leading-relaxed">{q.text}</p>

          {q.qType === 'four_choice' && q.choices && (
            <div className="space-y-3">
              {q.choices.map((choice, i) => (
                <ChoiceButton
                  key={i}
                  label={`${i + 1}`}
                  text={choice}
                  state={
                    answered === null ? 'idle' :
                    i === q.correct ? 'correct' :
                    answered === i ? 'wrong' : 'idle'
                  }
                  disabled={answered !== null}
                  onClick={() => setAnswered(i)}
                />
              ))}
            </div>
          )}

          {q.qType === 'true_false' && (
            <div className="flex gap-4">
              {([true, false] as const).map(val => (
                <TFButton
                  key={String(val)}
                  val={val}
                  state={
                    answered === null ? 'idle' :
                    val === q.answer ? 'correct' :
                    answered === val ? 'wrong' : 'idle'
                  }
                  disabled={answered !== null}
                  onClick={() => setAnswered(val)}
                />
              ))}
            </div>
          )}

          {answered !== null && (
            <div className={`rounded-xl p-4 space-y-2 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                {isCorrect ? '✓ 正解！' : '✗ 不正解'}
              </p>
              <p className="text-sm text-studio-ink leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {answered !== null && (
            <button
              onClick={() => {
                if (current + 1 >= total) {
                  setFinished(true)
                } else {
                  setCurrent(c => c + 1)
                  setAnswered(null)
                }
              }}
              className="w-full bg-studio-ink text-white py-3 rounded-xl hover:bg-studio-ink-hover transition-colors font-medium"
            >
              {current + 1 >= total ? '完了' : '次の問題 →'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

function ChoiceButton({ label, text, state, disabled, onClick }: {
  label: string; text: string
  state: 'idle' | 'correct' | 'wrong'
  disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm',
        state === 'correct' ? 'border-emerald-400 bg-emerald-50 text-emerald-800' :
        state === 'wrong'   ? 'border-red-400 bg-red-50 text-red-800' :
        disabled            ? 'border-studio-line text-studio-muted cursor-default' :
        'border-studio-line hover:border-studio-ink hover:bg-studio-canvas text-studio-ink',
      ].join(' ')}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
        state === 'correct' ? 'bg-emerald-500 text-white' :
        state === 'wrong'   ? 'bg-red-500 text-white' :
        'bg-studio-line text-studio-muted'
      }`}>{label}</span>
      <span>{text}</span>
    </button>
  )
}

function TFButton({ val, state, disabled, onClick }: {
  val: boolean; state: 'idle' | 'correct' | 'wrong'
  disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex-1 flex flex-col items-center gap-1 py-4 rounded-xl border-2 transition-colors',
        state === 'correct' ? 'border-emerald-400 bg-emerald-50' :
        state === 'wrong'   ? 'border-red-400 bg-red-50' :
        disabled            ? 'border-studio-line cursor-default' :
        'border-studio-line hover:border-studio-ink hover:bg-studio-canvas',
      ].join(' ')}
    >
      <span className="text-3xl leading-none">{val ? '○' : '×'}</span>
      <span className={`text-sm font-medium ${
        state === 'correct' ? 'text-emerald-700' :
        state === 'wrong'   ? 'text-red-600' : 'text-studio-muted'
      }`}>{val ? '正しい' : '誤り'}</span>
    </button>
  )
}
