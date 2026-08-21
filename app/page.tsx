'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DrillData, Lesson, Question, SeriesGuide, CourseGuide, Course } from '@/lib/types'

/* ── UI 選択状態 ───────────────────────────────────────────── */
type ActiveSelection =
  | { type: 'series' }
  | { type: 'course'; courseIdx: number }
  | { type: 'lesson'; courseIdx: number; lessonIdx: number }
  | { type: 'question'; courseIdx: number; lessonIdx: number; qIdx: number }
  | { type: 'settings' }

/* ── 定数 ────────────────────────────────────────────────── */
const STATUS_LABEL  = { pending: '未生成', draft: '下書き', approved: 'これでよい' } as const
const STATUS_DOT    = { pending: '□', draft: '○', approved: '●' } as const
const STATUS_DOT_COLOR = {
  pending:  'text-white/40',
  draft:    'text-amber-400',
  approved: 'text-emerald-400',
} as const
const INSPECT_LABEL = { pending: '未実施', pass: '合格', fail: '不合格' } as const

const EMPTY_SERIES_GUIDE: SeriesGuide = {
  purpose: '', terms: '', aux_concept: '',
  forbidden_synonyms: 'フォーマル度・ドレスコード・ランク・レベル・格式・ステータス・燕尾服・タキシード・カクテルドレス',
  exceptions: '', writing_style: '',
}

/* ── メインページ ─────────────────────────────────────────── */
export default function Page() {
  const [seriesGuide, setSeriesGuide] = useState<SeriesGuide>(EMPTY_SERIES_GUIDE)
  const [seriesTitle, setSeriesTitle] = useState('格とTPO')
  const [courses, setCourses]         = useState<Course[]>([])
  const [apiKey, setApiKey]           = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const [selected, setSelected]   = useState<ActiveSelection>({ type: 'series' })
  const [seriesOpen, setSeriesOpen] = useState(true)
  const [openCourseIdx, setOpenCourseIdx] = useState<number | null>(0)
  const [openLesson, setOpenLesson] = useState<number | null>(null)

  /* 初期データ読み込み */
  useEffect(() => {
    fetch('/api/data')
      .then(r => r.json())
      .then((d: DrillData) => {
        setSeriesGuide(d.series.guide)
        setSeriesTitle(d.series.title)
        setCourses(d.courses)
      })
      .finally(() => setInitLoading(false))
  }, [])

  const updateLesson = useCallback((updated: Lesson) => {
    setCourses(prev => prev.map(c => ({
      ...c,
      lessons: c.lessons.map(l => l.id === updated.id ? updated : l),
    })))
  }, [])

  const handleGenerate = useCallback(async (courseIdx: number, lessonIdx: number) => {
    const lesson = courses[courseIdx]?.lessons[lessonIdx]
    if (!lesson) return
    if (lesson.status === 'draft' && !window.confirm('現在の下書きを削除して再生成しますか？')) return

    setGeneratingId(lesson.id)
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, apiKey }),
    })
    const data = await res.json() as Lesson & { error?: string }
    setGeneratingId(null)
    updateLesson(data)
    setSelected({ type: 'lesson', courseIdx, lessonIdx })
  }, [courses, apiKey, updateLesson])

  const handleApprove = useCallback(async (courseIdx: number, lessonIdx: number) => {
    const lesson = courses[courseIdx]?.lessons[lessonIdx]
    if (!lesson) return
    const res = await fetch('/api/approve-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id }),
    })
    const data = await res.json() as Lesson
    updateLesson(data)
  }, [courses, updateLesson])

  const handleSaveQuestion = useCallback(async (courseIdx: number, lessonIdx: number, updatedQ: Question) => {
    const lesson = courses[courseIdx]?.lessons[lessonIdx]
    if (!lesson) return
    const questions = lesson.questions.map(q => q.id === updatedQ.id ? updatedQ : q)
    const res = await fetch('/api/save-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, questions }),
    })
    const data = await res.json() as Lesson
    updateLesson(data)
  }, [courses, updateLesson])

  if (initLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-studio-canvas text-studio-muted text-sm">
        読み込み中…
      </div>
    )
  }

  const selectedCourseIdx =
    selected.type === 'course' ? selected.courseIdx
    : selected.type === 'lesson' || selected.type === 'question' ? selected.courseIdx
    : null
  const selectedLessonIdx =
    selected.type === 'lesson' ? selected.lessonIdx
    : selected.type === 'question' ? selected.lessonIdx
    : null
  const selectedCourse = selectedCourseIdx !== null ? courses[selectedCourseIdx] : undefined
  const selectedLesson = selectedCourse && selectedLessonIdx !== null
    ? selectedCourse.lessons[selectedLessonIdx]
    : undefined

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-studio-canvas text-sm font-sans">

      <header className="h-7 shrink-0 flex items-center justify-center border-b border-studio-title bg-studio-title">
        <span className="text-[11px] font-medium tracking-wide text-white">Gofuku Quiz 工房</span>
      </header>

      <div className="flex flex-1 min-h-0">
      {/* ── P1: ツリー ── */}
      <aside className="flex-[2] min-w-0 bg-slate-800 text-white flex flex-col overflow-y-auto">
        <nav className="flex-1 p-2 text-xs">
          <TreeItem
            indent={0} chevron={seriesOpen ? '▼' : '▶'} label={seriesTitle} tag="シリーズ"
            active={selected.type === 'series'}
            onClick={() => { setSeriesOpen(v => !v); setSelected({ type: 'series' }) }}
          />
          {seriesOpen && courses.map((course, courseIdx) => {
            const isOpen = openCourseIdx === courseIdx
            return (
              <div key={course.id}>
                <TreeItem
                  indent={1}
                  chevron={isOpen ? '▼' : '▶'}
                  label={course.title}
                  tag="コース"
                  active={selected.type === 'course' && selected.courseIdx === courseIdx}
                  onClick={() => {
                    setOpenCourseIdx(isOpen ? null : courseIdx)
                    setSelected({ type: 'course', courseIdx })
                  }}
                />
                {isOpen && course.lessons.map((lesson, lessonIdx) => {
                  const locked = lessonIdx > 0 && course.lessons[lessonIdx - 1].status !== 'approved'
                  const lessonActive = selectedLessonIdx === lessonIdx && selectedCourseIdx === courseIdx
                  return (
                    <div key={lesson.id}>
                      <button
                        disabled={locked}
                        onClick={() => {
                          setOpenLesson(openLesson === lessonIdx && selectedCourseIdx === courseIdx ? null : lessonIdx)
                          setSelected({ type: 'lesson', courseIdx, lessonIdx })
                        }}
                        className={[
                          'w-full flex items-center gap-1.5 pl-8 pr-2 py-1.5 rounded text-left transition-colors',
                          locked ? 'opacity-35 cursor-not-allowed' : 'hover:bg-slate-700',
                          lessonActive && selected.type !== 'question' ? 'bg-slate-700' : '',
                        ].join(' ')}
                      >
                        <span className={`text-[11px] w-3 text-center ${STATUS_DOT_COLOR[lesson.status]}`}>
                          {STATUS_DOT[lesson.status]}
                        </span>
                        <span className="truncate text-white/90">{lesson.title}</span>
                      </button>

                      {openLesson === lessonIdx && selectedCourseIdx === courseIdx && !locked && lesson.questions.map((q, qIdx) => (
                        <button
                          key={q.id}
                          onClick={() => setSelected({ type: 'question', courseIdx, lessonIdx, qIdx })}
                          className={[
                            'w-full flex items-center gap-1.5 pl-12 pr-2 py-1 rounded text-left hover:bg-slate-700',
                            selected.type === 'question' && selected.courseIdx === courseIdx
                              && selected.lessonIdx === lessonIdx && selected.qIdx === qIdx
                              ? 'bg-slate-700' : '',
                          ].join(' ')}
                        >
                          <span className="text-[10px] text-white/45 w-8">設問{q.id}</span>
                          <span className={`text-[9px] px-1 rounded ${
                            q.qType === 'four_choice' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
                          }`}>
                            {q.qType === 'four_choice' ? '四択' : '○×'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-2 shrink-0">
          <button
            onClick={() => setSelected({ type: 'settings' })}
            className={[
              'w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
              'text-slate-400 hover:text-slate-200 hover:bg-slate-700',
              selected.type === 'settings' ? 'bg-slate-700 text-slate-200' : '',
            ].join(' ')}
          >
            <span>⚙</span>設定
          </button>
        </div>
      </aside>

      {/* ── P2: ガイド ── */}
      <div className="flex-[4] min-w-0 border-r border-studio-line flex flex-col bg-studio-canvas overflow-y-auto">
        <GuidePane
          selected={selected}
          seriesTitle={seriesTitle}
          seriesGuide={seriesGuide}
          courses={courses}
          apiKey={apiKey}
          onSaveSeriesGuide={async (g) => {
            await fetch('/api/save-guide', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'series', guide: g }),
            })
            setSeriesGuide(g)
          }}
          onSaveCourseGuide={async (courseId, g) => {
            await fetch('/api/save-guide', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'course', courseId, guide: g }),
            })
            setCourses(prev => prev.map(c => c.id === courseId ? { ...c, guide: g } : c))
          }}
          onSaveApiKey={setApiKey}
        />
      </div>

      {/* ── P3: 編集 ── */}
      <div className="flex-[4] min-w-0 flex flex-col bg-studio-canvas overflow-y-auto">
        {selected.type === 'settings' || selected.type === 'series' || selected.type === 'course' ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-studio-muted text-xs">← ツリーからレッスンを選ぶと設問一覧が表示されます</p>
          </div>
        ) : selected.type === 'question' && selectedLesson ? (
          <QuestionEditor
            lesson={selectedLesson}
            lessonIdx={selected.lessonIdx}
            question={selectedLesson.questions[selected.qIdx]}
            qIdx={selected.qIdx}
            onSave={(q) => handleSaveQuestion(selected.courseIdx, selected.lessonIdx, q)}
          />
        ) : selected.type === 'lesson' && selectedLesson ? (
          <LessonEditor
            lesson={selectedLesson}
            lessonIdx={selected.lessonIdx}
            apiKey={apiKey}
            generating={generatingId === selectedLesson.id}
            onGenerate={() => handleGenerate(selected.courseIdx, selected.lessonIdx)}
            onApprove={() => handleApprove(selected.courseIdx, selected.lessonIdx)}
            onSelectQuestion={(li, qi) => setSelected({
              type: 'question',
              courseIdx: selected.courseIdx,
              lessonIdx: li,
              qIdx: qi,
            })}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-studio-muted text-xs">← ツリーからレッスンを選ぶと設問一覧が表示されます</p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

/* ── ツリーアイテム ── */
function TreeItem({ indent, chevron, label, tag, active, onClick }: {
  indent: number; chevron: string; label: string; tag: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-1 py-1.5 rounded text-left text-xs hover:bg-slate-700 transition-colors',
        indent === 0 ? 'px-2' : 'pl-5 pr-2',
        active ? 'bg-slate-700' : '',
      ].join(' ')}
    >
      <span className="text-white/45 w-3 text-center text-[10px]">{chevron}</span>
      <span className={`truncate flex-1 ${indent === 0 ? 'text-white font-medium' : 'text-white/90'}`}>{label}</span>
      <span className="text-[9px] text-white/45 shrink-0">{tag}</span>
    </button>
  )
}

/* ── P2: ガイドペイン ── */
function GuidePane({
  selected, seriesTitle, seriesGuide, courses, apiKey,
  onSaveSeriesGuide, onSaveCourseGuide, onSaveApiKey,
}: {
  selected: ActiveSelection
  seriesTitle: string
  seriesGuide: SeriesGuide
  courses: Course[]
  apiKey: string
  onSaveSeriesGuide: (g: SeriesGuide) => Promise<void>
  onSaveCourseGuide: (courseId: string, g: CourseGuide) => Promise<void>
  onSaveApiKey: (k: string) => void
}) {
  if (selected.type === 'settings') {
    return (
      <div className="flex flex-col h-full">
        <PaneHeader badge="設定" title="APIキー" />
        <div className="flex-1 p-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-studio-ink block mb-1">Anthropic APIキー</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => onSaveApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-studio-line bg-studio-card rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-studio-ink/20"
            />
            <p className="text-[10px] text-studio-muted mt-1">ファイルには保存されません。ページを閉じると消えます。</p>
          </div>
          {apiKey && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
              <span>✓</span><span>キー設定済み</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (selected.type === 'series') {
    return (
      <SeriesGuideForm
        title={seriesTitle}
        initial={seriesGuide}
        onSave={onSaveSeriesGuide}
      />
    )
  }

  if (selected.type === 'course') {
    const course = courses[selected.courseIdx]
    if (!course) return null
    return (
      <CourseGuideForm
        key={course.id}
        title={course.title}
        initial={course.guide}
        onSave={(g) => onSaveCourseGuide(course.id, g)}
      />
    )
  }

  const refCourse =
    (selected.type === 'lesson' || selected.type === 'question')
      ? courses[selected.courseIdx]
      : undefined

  /* レッスン/設問選択中：コースガイドを参照表示 */
  return (
    <div className="flex flex-col h-full">
      <PaneHeader badge="コースガイド" title={refCourse?.title ?? ''} dimmed />
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="space-y-3 bg-studio-card rounded-lg p-3">
          <FieldView label="各レッスンの役割" value={refCourse?.guide.lesson_roles || '（未記入）'} />
          <FieldView label="含めないこと" value={refCourse?.guide.exclude || ''} />
        </div>
        <p className="text-[10px] text-studio-muted text-center">コースを選択すると編集できます</p>
      </div>
    </div>
  )
}

/* ── シリーズガイドフォーム ── */
function SeriesGuideForm({ title, initial, onSave }: { title: string; initial: SeriesGuide; onSave: (g: SeriesGuide) => Promise<void> }) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft(initial) }, [initial])

  const set = (k: keyof SeriesGuide) => (v: string) => setDraft(d => ({ ...d, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <PaneHeader badge="シリーズガイド" title={title} />
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <GF label="目的"            value={draft.purpose}           onChange={set('purpose')}           rows={8} />
        <GF label="使う用語"        value={draft.terms}             onChange={set('terms')}             rows={3} />
        <GF label="補助概念（任意）" value={draft.aux_concept}      onChange={set('aux_concept')}       rows={5} />
        <GF label="禁止する言い換え" value={draft.forbidden_synonyms} readOnly rows={2} />
        <GF label="例外"            value={draft.exceptions}        onChange={set('exceptions')}        rows={8} />
        <GF label="文体"            value={draft.writing_style}     onChange={set('writing_style')}     rows={5} />
      </div>
      <div className="p-4 border-t border-studio-line shrink-0">
        <button
          onClick={handleSave} disabled={saving}
          className="w-full bg-studio-ink text-white text-xs py-2 rounded-lg hover:bg-studio-ink-hover disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

/* ── コースガイドフォーム ── */
function CourseGuideForm({ title, initial, onSave }: { title: string; initial: CourseGuide; onSave: (g: CourseGuide) => Promise<void> }) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft(initial) }, [initial])

  const set = (k: keyof CourseGuide) => (v: string) => setDraft(d => ({ ...d, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <PaneHeader badge="コースガイド" title={title} />
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <GF label="各レッスンの役割"           value={draft.lesson_roles} onChange={set('lesson_roles')} rows={5} />
        <GF label="各回で必ず出すこと"         value={draft.must_include} onChange={set('must_include')} rows={3} />
        <GF label="後のレッスンで再登場させること" value={draft.revisit}  onChange={set('revisit')}      rows={3} />
        <GF label="含めないこと"               value={draft.exclude}      readOnly                        rows={2} />
        <GF label="完了条件"                   value={draft.completion}   onChange={set('completion')}    rows={2} />
      </div>
      <div className="p-4 border-t border-studio-line shrink-0">
        <button
          onClick={handleSave} disabled={saving}
          className="w-full bg-studio-ink text-white text-xs py-2 rounded-lg hover:bg-studio-ink-hover disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

/* ── P3: レッスン編集 ── */
function LessonEditor({ lesson, lessonIdx, apiKey, generating, onGenerate, onApprove, onSelectQuestion }: {
  lesson: Lesson; lessonIdx: number; apiKey: string; generating: boolean
  onGenerate: () => void; onApprove: () => void
  onSelectQuestion: (li: number, qi: number) => void
}) {
  if (!lesson) return null

  return (
    <div className="flex flex-col h-full">
      <PaneHeader
        badge={`レッスン ${lessonIdx + 1}`}
        title={lesson.title}
        right={
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            lesson.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
            lesson.status === 'draft'    ? 'bg-amber-100 text-amber-700' :
            'bg-studio-card text-studio-muted'
          }`}>
            {STATUS_LABEL[lesson.status]}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* エラー表示 */}
        {lesson.generationError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-600">
            <span className="font-semibold">生成エラー: </span>{lesson.generationError}
            <p className="text-red-400 mt-1">下書きはそのまま残っています。再生成してください。</p>
          </div>
        )}

        {/* アクションバー */}
        <div className="flex items-center gap-3 flex-wrap">
          {lesson.status === 'pending' ? (
            <button
              onClick={onGenerate} disabled={generating || !apiKey}
              className="bg-studio-ink text-white text-xs px-5 py-2 rounded-lg hover:bg-studio-ink-hover disabled:opacity-50 transition-colors font-medium"
            >
              {generating ? '生成中…' : 'このレッスンを生成'}
            </button>
          ) : (
            <>
              <button
                onClick={onGenerate} disabled={generating || !apiKey}
                className="border border-studio-line text-studio-ink text-xs px-3 py-2 rounded-lg hover:bg-studio-card disabled:opacity-50 transition-colors"
              >
                {generating ? '生成中…' : 'レッスンを再生成'}
                <span className="text-[10px] text-studio-muted ml-1">（確認あり）</span>
              </button>
              <button
                onClick={() => window.open(`/preview/${lesson.id}`, '_blank')}
                className="border border-studio-line text-studio-ink text-xs px-3 py-2 rounded-lg hover:bg-studio-card transition-colors"
              >
                プレビュー ▶
              </button>
            </>
          )}
          {!apiKey && (
            <span className="text-[10px] text-amber-500">⚠ APIキー未設定（設定で入力してください）</span>
          )}
          {lesson.inspection.status === 'pass' && lesson.status === 'draft' && (
            <button
              onClick={onApprove}
              className="ml-auto bg-emerald-600 text-white text-xs px-5 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              これでよい ✓
            </button>
          )}
        </div>

        {/* 検査バッジ */}
        {lesson.status !== 'pending' && (
          <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs ${
            lesson.inspection.status === 'pass' ? 'bg-emerald-50 border border-emerald-200' :
            lesson.inspection.status === 'fail' ? 'bg-red-50 border border-red-200' :
            'bg-studio-card border border-studio-line'
          }`}>
            <span className={`text-base leading-none mt-0.5 ${
              lesson.inspection.status === 'pass' ? 'text-emerald-500' :
              lesson.inspection.status === 'fail' ? 'text-red-500' : 'text-studio-muted'
            }`}>
              {lesson.inspection.status === 'pass' ? '✓' :
               lesson.inspection.status === 'fail' ? '✗' : '–'}
            </span>
            <div>
              <span className={`font-semibold ${
                lesson.inspection.status === 'pass' ? 'text-emerald-700' :
                lesson.inspection.status === 'fail' ? 'text-red-600' : 'text-studio-muted'
              }`}>
                機械検査: {INSPECT_LABEL[lesson.inspection.status]}
              </span>
              {lesson.inspection.status === 'pass' && (
                <p className="text-emerald-600 mt-0.5">8問・タイプ形式OK・解説あり・禁止語なし</p>
              )}
              {lesson.inspection.errors.map((e, i) => (
                <p key={i} className="text-red-500 mt-0.5">• {e}</p>
              ))}
            </div>
          </div>
        )}

        {/* 設問一覧 */}
        {lesson.questions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold text-studio-muted uppercase tracking-wider">
              設問一覧 — {lesson.questions.length} 問
            </h3>
            {lesson.questions.map((q, qIdx) => (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(lessonIdx, qIdx)}
                className="w-full text-left border border-studio-line bg-studio-card rounded-xl p-3.5 hover:border-studio-ink/30 hover:bg-white/50 transition-all group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-mono text-studio-muted shrink-0 mt-0.5">Q{q.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-medium mt-0.5 ${
                    q.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {q.qType === 'four_choice' ? '四択' : '○×'}
                  </span>
                  <span className="text-xs text-studio-ink line-clamp-2 flex-1">{q.text}</span>
                  <span className="text-[10px] text-studio-muted/60 group-hover:text-studio-muted shrink-0 mt-0.5">編集 →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {lesson.status === 'pending' && !generating && (
          <div className="text-center py-16 text-studio-muted/50 text-xs space-y-2">
            <div className="text-3xl">○</div>
            <p className="font-medium text-studio-muted">未生成</p>
            {lessonIdx > 0 && <p>前のレッスンが「これでよい」になると生成できます。</p>}
          </div>
        )}

        {generating && (
          <div className="text-center py-16 text-studio-muted text-xs space-y-2">
            <div className="text-2xl animate-spin inline-block">⟳</div>
            <p>Claude が設問を生成中です…</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── P3: 設問編集 ── */
function QuestionEditor({ lesson, lessonIdx, question, qIdx, onSave }: {
  lesson: Lesson; lessonIdx: number; question: Question; qIdx: number
  onSave: (q: Question) => Promise<void>
}) {
  const [draft, setDraft] = useState(question)
  const [saving, setSaving]   = useState(false)
  useEffect(() => { setDraft(question) }, [question])

  if (!question) return null

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <PaneHeader
        badge={`設問 ${question.id}  /  レッスン ${lessonIdx + 1}`}
        title={lesson.title}
        right={
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
            draft.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {draft.qType === 'four_choice' ? '四択' : '○×'}
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="text-[11px] font-semibold text-studio-muted block mb-1.5">問題文</label>
          <textarea
            value={draft.text}
            onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
            rows={3}
            className="w-full border border-studio-line bg-studio-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-studio-ink/20 resize-none"
          />
        </div>

        {draft.qType === 'four_choice' && draft.choices && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-studio-muted block">選択肢</label>
            {draft.choices.map((choice, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <button
                  onClick={() => setDraft(d => ({ ...d, correct: i }))}
                  className={`w-5 h-5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                    i === draft.correct ? 'bg-emerald-500 text-white' : 'bg-studio-line text-studio-muted hover:bg-studio-muted/30'
                  }`}
                >
                  {i + 1}
                </button>
                <input
                  value={choice}
                  onChange={e => setDraft(d => {
                    const choices = [...(d.choices ?? [])]
                    choices[i] = e.target.value
                    return { ...d, choices }
                  })}
                  className="flex-1 border border-studio-line bg-studio-card rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-studio-ink/20"
                />
                {i === draft.correct && (
                  <span className="text-[10px] text-emerald-600 font-semibold shrink-0">正解</span>
                )}
              </div>
            ))}
            <p className="text-[10px] text-studio-muted">番号ボタンを押すと正解を変更できます</p>
          </div>
        )}

        {draft.qType === 'true_false' && (
          <div>
            <label className="text-[11px] font-semibold text-studio-muted block mb-2">正解</label>
            <div className="flex gap-3">
              {([true, false] as const).map(val => (
                <button
                  key={String(val)}
                  onClick={() => setDraft(d => ({ ...d, answer: val }))}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 transition-colors ${
                    draft.answer === val
                      ? val ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'
                      : 'border-studio-line hover:border-studio-ink/30'
                  }`}
                >
                  <span className="text-xl leading-none">{val ? '○' : '×'}</span>
                  <span className="text-xs font-medium">{val ? '正しい' : '誤り'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-studio-muted block mb-1.5">解説（2〜3文）</label>
          <textarea
            value={draft.explanation}
            onChange={e => setDraft(d => ({ ...d, explanation: e.target.value }))}
            rows={3}
            className="w-full border border-studio-line bg-studio-card rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-studio-ink/20 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave} disabled={saving}
            className="flex-1 bg-studio-ink text-white text-xs py-2.5 rounded-lg hover:bg-studio-ink-hover disabled:opacity-50 transition-colors font-medium"
          >
            {saving ? '保存中…' : 'この設問を更新'}
          </button>
          <button
            onClick={() => setDraft(question)}
            className="border border-studio-line text-studio-muted text-xs px-4 py-2.5 rounded-lg hover:bg-studio-card transition-colors"
          >
            元に戻す
          </button>
        </div>

        <p className="text-center text-[10px] text-studio-muted">
          設問 {qIdx + 1} / {lesson.questions.length}
        </p>
      </div>
    </div>
  )
}

/* ── 共通パーツ ── */
function PaneHeader({ badge, title, right, dimmed }: {
  badge: string; title: string; right?: React.ReactNode; dimmed?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${dimmed ? 'border-studio-line/60 bg-studio-canvas' : 'border-studio-line bg-white'}`}>
      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide ${dimmed ? 'bg-white text-studio-muted' : 'bg-[#E8EEF4] text-studio-ink'}`}>
        {badge}
      </span>
      <span className={`text-sm font-semibold flex-1 truncate ${dimmed ? 'text-studio-muted' : 'text-studio-ink'}`}>
        {title}
      </span>
      {right}
    </div>
  )
}

/* ガイドフィールド（controlled） */
function GF({ label, value, onChange, rows = 3, readOnly = false }: {
  label: string; value: string; onChange?: (v: string) => void; rows?: number; readOnly?: boolean
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-studio-ink block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        rows={rows}
        readOnly={readOnly}
        className={`w-full border rounded-lg px-2.5 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-studio-ink/20 ${
          readOnly ? 'bg-studio-card border-studio-line text-studio-muted cursor-default' : 'border-studio-line bg-studio-card'
        }`}
      />
    </div>
  )
}

function FieldView({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-studio-ink mb-0.5">{label}</div>
      <div className="text-xs text-studio-ink/80 whitespace-pre-line">{value}</div>
    </div>
  )
}
