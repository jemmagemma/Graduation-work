'use client'

import { useState, useEffect } from 'react'
import type { Lesson, Question } from '@/lib/types'

export default function PreviewPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const [lesson, setLesson]   = useState<Lesson | null>(null)
  const [current, setCurrent] = useState(0)
  const [answered, setAnswered] = useState<number | boolean | null>(null)
  const [finished, setFinished] = useState(false)
  const [lessonId, setLessonId] = useState('')

  useEffect(() => {
    params.then(p => {
      setLessonId(p.lessonId)
      fetch('/api/data')
        .then(r => r.json())
        .then(d => {
          const found = (d.courses ?? [])
            .flatMap((c: { lessons: Lesson[] }) => c.lessons)
            .find((l: Lesson) => l.id === p.lessonId)
          setLesson(found ?? null)
        })
    })
  }, [params])

  if (!lesson) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100 text-slate-500 text-sm">
        読み込み中…
      </div>
    )
  }

  if (lesson.questions.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100 text-slate-500 text-sm text-center px-8">
        <div>
          <p className="text-lg font-bold mb-2">設問がありません</p>
          <p>先にレッスンを生成してください。</p>
          <button onClick={() => window.close()} className="mt-4 text-slate-400 underline text-xs">閉じる</button>
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100 text-center px-8">
        <div className="bg-white rounded-2xl shadow-sm p-10 max-w-sm w-full">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">レッスン完了</h2>
          <p className="text-sm text-slate-500 mb-6">
            {lesson.title} — {lesson.questions.length} 問を解きました
          </p>
          <p className="text-[11px] text-slate-400 mb-6">（プレビューのため点数は保存されません）</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setCurrent(0); setAnswered(null); setFinished(false) }}
              className="border border-stone-300 text-slate-600 text-sm px-5 py-2 rounded-lg hover:bg-stone-50"
            >
              もう一度
            </button>
            <button
              onClick={() => window.close()}
              className="bg-slate-800 text-white text-sm px-5 py-2 rounded-lg hover:bg-slate-700"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    )
  }

  const q = lesson.questions[current]
  const total = lesson.questions.length
  const progress = ((current) / total) * 100

  function handleAnswer(val: number | boolean) {
    setAnswered(val)
  }

  function handleNext() {
    if (current + 1 >= total) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
      setAnswered(null)
    }
  }

  const isCorrect = answered !== null && (
    q.qType === 'four_choice' ? answered === q.correct : answered === q.answer
  )

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <div>
          <span className="text-[10px] text-slate-400 tracking-wide">令和きもの販売員ドリル · プレビュー</span>
          <h1 className="text-sm font-bold text-slate-800 leading-tight">{lesson.title}</h1>
        </div>
        <div className="flex-1">
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-500 shrink-0">
          {current + 1} / {total}
        </span>
        <button onClick={() => window.close()} className="text-[11px] text-slate-400 hover:text-slate-600 ml-2">
          ✕ 閉じる
        </button>
      </header>

      {/* メイン */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-2xl w-full space-y-6">
          {/* 問題番号・タイプ */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">問 {current + 1}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              q.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {q.qType === 'four_choice' ? '四択' : '○×'}
            </span>
          </div>

          {/* 問題文 */}
          <p className="text-base font-semibold text-slate-800 leading-relaxed">{q.text}</p>

          {/* 選択肢 */}
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
                  onClick={() => handleAnswer(i)}
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
                  onClick={() => handleAnswer(val)}
                />
              ))}
            </div>
          )}

          {/* 正誤 + 解説 */}
          {answered !== null && (
            <div className={`rounded-xl p-4 space-y-2 ${isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                {isCorrect ? '✓ 正解！' : '✗ 不正解'}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* 次へ */}
          {answered !== null && (
            <button
              onClick={handleNext}
              className="w-full bg-slate-800 text-white py-3 rounded-xl hover:bg-slate-700 transition-colors font-medium"
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
        disabled            ? 'border-stone-200 text-slate-400 cursor-default' :
        'border-stone-200 hover:border-slate-400 hover:bg-stone-50 text-slate-700',
      ].join(' ')}
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
        state === 'correct' ? 'bg-emerald-500 text-white' :
        state === 'wrong'   ? 'bg-red-500 text-white' :
        'bg-stone-200 text-slate-500'
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
        disabled            ? 'border-stone-200 cursor-default' :
        'border-stone-200 hover:border-slate-400 hover:bg-stone-50',
      ].join(' ')}
    >
      <span className="text-3xl leading-none">{val ? '○' : '×'}</span>
      <span className={`text-sm font-medium ${
        state === 'correct' ? 'text-emerald-700' :
        state === 'wrong'   ? 'text-red-600' : 'text-slate-600'
      }`}>{val ? '正しい' : '誤り'}</span>
    </button>
  )
}
