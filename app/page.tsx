'use client'

import { useState } from 'react'

/* ── 型 ─────────────────────────────────────────────────── */
type ActiveSelection =
  | { type: 'series' }
  | { type: 'course' }
  | { type: 'lesson'; idx: number }
  | { type: 'question'; lessonIdx: number; qIdx: number }
  | { type: 'settings' }

type LessonStatus = 'pending' | 'draft' | 'approved'
type InspectionStatus = 'pending' | 'pass' | 'fail'

interface Question {
  id: number
  qType: 'four_choice' | 'true_false'
  text: string
  choices?: string[]
  correct?: number
  answer?: boolean
  explanation: string
}

interface Lesson {
  title: string
  status: LessonStatus
  inspection: InspectionStatus
  locked: boolean
  questions: Question[]
}

/* ── モックデータ ─────────────────────────────────────────── */
const LESSONS: Lesson[] = [
  {
    title: '第一礼装',
    status: 'draft',
    inspection: 'pass',
    locked: false,
    questions: [
      { id: 1, qType: 'four_choice', text: '黒留袖の「段」として正しいものはどれですか？', choices: ['第一礼装', '準礼装', '略礼服', 'しゃれもの'], correct: 0, explanation: '黒留袖は已婚女性の第一礼装です。五つ紋・比翼仕立てが形式上の要件になります。' },
      { id: 2, qType: 'true_false', text: '色打掛は第一礼装に分類される。', answer: true, explanation: '色打掛は婚礼衣装として第一礼装に位置づけられます。' },
      { id: 3, qType: 'four_choice', text: '振袖を着用できる対象について正しいものはどれですか？', choices: ['未婚女性のみ', '既婚女性のみ', '性別に関わらず', '年齢制限なし'], correct: 0, explanation: '振袖は未婚女性の第一礼装です。成人式や婚礼の席での着用が一般的です。' },
      { id: 4, qType: 'true_false', text: '留袖には必ず五つ紋が必要である。', answer: true, explanation: '留袖（黒留袖・色留袖）は最高の礼装として五つ紋が原則です。' },
      { id: 5, qType: 'four_choice', text: '色留袖の着用対象として正しいものはどれですか？', choices: ['未婚・既婚ともに可', '既婚女性のみ', '未婚女性のみ', '制限なし'], correct: 0, explanation: '色留袖は未婚・既婚を問わず着用できる礼装です。' },
      { id: 6, qType: 'true_false', text: '黒留袖の裾模様は上前のみに入っている。', answer: false, explanation: '黒留袖の裾模様は上前・下前・おくみの全体に入ります。' },
      { id: 7, qType: 'four_choice', text: '打掛の着方として正しいものはどれですか？', choices: ['帯の上から羽織る', '帯の下に着る', '肩に掛けるだけ', 'どちらでもよい'], correct: 0, explanation: '打掛は帯の上から羽織る衣装で、婚礼などの特別な場面で着用します。' },
      { id: 8, qType: 'true_false', text: '白無垢は第一礼装に含まれる。', answer: true, explanation: '白無垢は婚礼の最礼装として第一礼装に分類されます。' },
    ],
  },
  { title: '準礼装・略礼服', status: 'pending', inspection: 'pending', locked: true, questions: [] },
  { title: 'しゃれもの',   status: 'pending', inspection: 'pending', locked: true, questions: [] },
]

const STATUS_LABEL: Record<LessonStatus, string> = { pending: '未生成', draft: '下書き', approved: 'これでよい' }
const STATUS_DOT: Record<LessonStatus, string>   = { pending: '□', draft: '○', approved: '●' }
const STATUS_DOT_COLOR: Record<LessonStatus, string> = {
  pending:  'text-slate-400',
  draft:    'text-amber-400',
  approved: 'text-emerald-400',
}
const INSPECTION_LABEL: Record<InspectionStatus, string> = { pending: '未実施', pass: '合格', fail: '不合格' }

/* ── メインページ ─────────────────────────────────────────── */
export default function Page() {
  const [selected, setSelected] = useState<ActiveSelection>({ type: 'lesson', idx: 0 })
  const [seriesOpen, setSeriesOpen]   = useState(true)
  const [courseOpen, setCourseOpen]   = useState(true)
  const [openLesson, setOpenLesson]   = useState<number | null>(0)

  function selectLesson(idx: number) {
    setSelected({ type: 'lesson', idx })
    setOpenLesson(openLesson === idx ? null : idx)
  }

  function selectQuestion(lessonIdx: number, qIdx: number) {
    setSelected({ type: 'question', lessonIdx, qIdx })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100 text-sm font-sans">

      {/* ── P1: ツリー ── */}
      <aside className="w-52 shrink-0 bg-slate-800 text-slate-200 flex flex-col overflow-y-auto">
        {/* ヘッダー */}
        <div className="px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="text-[10px] text-slate-400 tracking-widest uppercase">呉服販売員ドリル</div>
          <div className="text-base font-bold text-white leading-tight mt-0.5">Quiz 工房</div>
        </div>

        {/* ナビ */}
        <nav className="flex-1 p-2 text-xs">
          {/* シリーズ */}
          <TreeItem
            indent={0}
            chevron={seriesOpen ? '▼' : '▶'}
            label="格とTPO"
            tag="シリーズ"
            active={selected.type === 'series'}
            onClick={() => { setSeriesOpen(!seriesOpen); setSelected({ type: 'series' }) }}
          />

          {seriesOpen && (
            <>
              {/* コース */}
              <TreeItem
                indent={1}
                chevron={courseOpen ? '▼' : '▶'}
                label="着物の格"
                tag="コース"
                active={selected.type === 'course'}
                onClick={() => { setCourseOpen(!courseOpen); setSelected({ type: 'course' }) }}
              />

              {courseOpen && LESSONS.map((lesson, idx) => (
                <div key={idx}>
                  <button
                    disabled={lesson.locked}
                    onClick={() => selectLesson(idx)}
                    className={[
                      'w-full flex items-center gap-1.5 pl-8 pr-2 py-1.5 rounded text-left transition-colors',
                      lesson.locked ? 'opacity-35 cursor-not-allowed' : 'hover:bg-slate-700',
                      selected.type === 'lesson' && selected.idx === idx ? 'bg-slate-700' : '',
                      selected.type === 'question' && selected.lessonIdx === idx ? 'bg-slate-700/50' : '',
                    ].join(' ')}
                  >
                    <span className={`text-[11px] w-3 text-center ${STATUS_DOT_COLOR[lesson.status]}`}>
                      {STATUS_DOT[lesson.status]}
                    </span>
                    <span className="truncate text-slate-300">{lesson.title}</span>
                  </button>

                  {/* 設問ノード */}
                  {openLesson === idx && !lesson.locked && lesson.questions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => selectQuestion(idx, qIdx)}
                      className={[
                        'w-full flex items-center gap-1.5 pl-12 pr-2 py-1 rounded text-left hover:bg-slate-700 transition-colors',
                        selected.type === 'question' && selected.lessonIdx === idx && selected.qIdx === qIdx
                          ? 'bg-slate-700' : '',
                      ].join(' ')}
                    >
                      <span className="text-[10px] text-slate-500 w-8">設問{q.id}</span>
                      <span className={`text-[9px] px-1 rounded ${q.qType === 'four_choice' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'}`}>
                        {q.qType === 'four_choice' ? '四択' : '○×'}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </nav>

        {/* 設定 */}
        <div className="border-t border-slate-700 p-2 shrink-0">
          <button
            onClick={() => setSelected({ type: 'settings' })}
            className={[
              'w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors',
              'text-slate-400 hover:text-slate-200 hover:bg-slate-700',
              selected.type === 'settings' ? 'bg-slate-700 text-slate-200' : '',
            ].join(' ')}
          >
            <span>⚙</span>
            <span>設定</span>
          </button>
        </div>
      </aside>

      {/* ── P2: ガイド ── */}
      <div className="w-72 shrink-0 border-r border-stone-200 flex flex-col bg-white overflow-y-auto">
        <GuidePane selected={selected} />
      </div>

      {/* ── P3: 編集 / 設問 ── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto min-w-0">
        <EditorPane selected={selected} onSelectQuestion={selectQuestion} />
      </div>
    </div>
  )
}

/* ── ツリーアイテム ── */
function TreeItem({ indent, chevron, label, tag, active, onClick }: {
  indent: number; chevron: string; label: string; tag: string
  active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-1 py-1.5 rounded text-left text-xs transition-colors hover:bg-slate-700',
        indent === 0 ? 'px-2' : 'pl-5 pr-2',
        active ? 'bg-slate-700' : '',
      ].join(' ')}
    >
      <span className="text-slate-400 w-3 text-center text-[10px]">{chevron}</span>
      <span className={`${indent === 0 ? 'text-slate-200 font-medium' : 'text-slate-300'} truncate flex-1`}>{label}</span>
      <span className="text-[9px] text-slate-500 shrink-0">{tag}</span>
    </button>
  )
}

/* ── P2: ガイドペイン ── */
function GuidePane({ selected }: { selected: ActiveSelection }) {
  if (selected.type === 'settings') {
    return (
      <div className="flex flex-col h-full">
        <PaneHeader badge="設定" title="APIキー" />
        <div className="flex-1 p-4 space-y-4">
          <GuideField
            label="Anthropic APIキー"
            type="password"
            placeholder="sk-ant-..."
            hint="ファイルには保存されません。ページを閉じると消えます。"
          />
          <button className="w-full bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 transition-colors">
            保存
          </button>
        </div>
      </div>
    )
  }

  if (selected.type === 'series') {
    return (
      <div className="flex flex-col h-full">
        <PaneHeader badge="シリーズガイド" title="格とTPO" />
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <GuideField label="対象者" placeholder="例）他部門からの異動者。接客経験はあるが呉服用語は未経験の方を主な対象とする。" rows={3} />
          <GuideField label="目的" placeholder="例）呉服の「段」を理解し、お客様に正確な格の説明ができるようになる。" rows={3} />
          <GuideField label="使う用語" placeholder="例）段・礼装・略礼服・しゃれもの…" rows={2} />
          <GuideField label='補助語「段」の定義' placeholder="例）格の高低を表す本システム固有の言葉。" rows={2} />
          <GuideField label="禁止する言い換え" defaultValue="フォーマル度・ドレスコード・ランク・レベル" rows={2} readOnly />
          <GuideField label="例外" placeholder="例）振袖と留袖の上下比較は禁止…" rows={3} />
          <GuideField label="文体" placeholder="例）「です・ます」調。新卒が知らない用語は一度だけ定義する。" rows={2} />
        </div>
        <div className="p-4 border-t border-stone-100 shrink-0">
          <button className="w-full bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 transition-colors">保存</button>
        </div>
      </div>
    )
  }

  if (selected.type === 'course') {
    return (
      <div className="flex flex-col h-full">
        <PaneHeader badge="コースガイド" title="着物の格" />
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <GuideField
            label="各レッスンの役割"
            defaultValue={`レッスン1：第一礼装（黒留袖・色留袖・振袖・打掛）の段と着用シーン\nレッスン2：準礼装・略礼服の段と帯合わせの原則\nレッスン3：しゃれものの範囲と格外しの考え方`}
            rows={5}
          />
          <GuideField label="各回で必ず出すこと" placeholder="例）「段」を使った設問を最低2問。" rows={3} />
          <GuideField label="後のレッスンで再登場させること" placeholder="例）第一礼装で扱った黒留袖をレッスン3に再登場させる。" rows={3} />
          <GuideField label="含めないこと" defaultValue="話法・価格・着付けの技法" rows={2} readOnly />
          <GuideField label="完了条件" placeholder="例）3レッスン全問合格で完了。" rows={2} />
        </div>
        <div className="p-4 border-t border-stone-100 shrink-0">
          <button className="w-full bg-slate-800 text-white text-xs py-2 rounded hover:bg-slate-700 transition-colors">保存</button>
        </div>
      </div>
    )
  }

  /* レッスン・設問選択時はコースガイドを参照表示 */
  return (
    <div className="flex flex-col h-full">
      <PaneHeader badge="コースガイド" title="着物の格" dimmed />
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="space-y-3 bg-stone-50 rounded-lg p-3">
          <FieldView label="各レッスンの役割" value={"1：第一礼装の段と着用シーン\n2：準礼装・略礼服と帯合わせ\n3：しゃれものと格外し"} />
          <FieldView label="含めないこと" value="話法・価格・着付けの技法" />
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">コースを選択すると編集できます</p>
      </div>
    </div>
  )
}

/* ── P3: 編集ペイン ── */
function EditorPane({ selected, onSelectQuestion }: {
  selected: ActiveSelection
  onSelectQuestion: (lessonIdx: number, qIdx: number) => void
}) {
  if (selected.type === 'settings' || selected.type === 'series' || selected.type === 'course') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-300 text-xs text-center">
          ← ツリーからレッスンを選ぶと設問一覧が表示されます
        </p>
      </div>
    )
  }

  const lessonIdx = selected.type === 'lesson' ? selected.idx : selected.lessonIdx
  const lesson = LESSONS[lessonIdx]

  if (selected.type === 'question') {
    const q = lesson.questions[selected.qIdx]
    return <QuestionEditor lesson={lesson} lessonIdx={lessonIdx} question={q} qIdx={selected.qIdx} />
  }

  return <LessonEditor lesson={lesson} lessonIdx={lessonIdx} onSelectQuestion={onSelectQuestion} />
}

/* ── レッスン編集 ── */
function LessonEditor({ lesson, lessonIdx, onSelectQuestion }: {
  lesson: Lesson; lessonIdx: number
  onSelectQuestion: (li: number, qi: number) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <PaneHeader
        badge={`レッスン ${lessonIdx + 1}`}
        title={lesson.title}
        right={
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            lesson.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
            lesson.status === 'draft'    ? 'bg-amber-100 text-amber-700' :
            'bg-stone-100 text-slate-400'
          }`}>
            {STATUS_LABEL[lesson.status]}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* アクションバー */}
        <div className="flex items-center gap-3 flex-wrap">
          {lesson.status === 'pending' ? (
            <button className="bg-slate-800 text-white text-xs px-5 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium">
              このレッスンを生成
            </button>
          ) : (
            <>
              <button className="border border-stone-300 text-slate-600 text-xs px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors">
                レッスンを再生成
                <span className="text-[10px] text-slate-400 ml-1">（確認あり）</span>
              </button>
              <button className="border border-stone-300 text-slate-600 text-xs px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors">
                プレビュー ▶
              </button>
            </>
          )}
          {lesson.inspection === 'pass' && lesson.status === 'draft' && (
            <button className="ml-auto bg-emerald-600 text-white text-xs px-5 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
              これでよい ✓
            </button>
          )}
        </div>

        {/* 検査バッジ */}
        {lesson.status !== 'pending' && (
          <div className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs ${
            lesson.inspection === 'pass' ? 'bg-emerald-50 border border-emerald-200' :
            lesson.inspection === 'fail' ? 'bg-red-50 border border-red-200' :
            'bg-stone-50 border border-stone-200'
          }`}>
            <span className={`text-base leading-none mt-0.5 ${
              lesson.inspection === 'pass' ? 'text-emerald-500' :
              lesson.inspection === 'fail' ? 'text-red-500' : 'text-slate-300'
            }`}>
              {lesson.inspection === 'pass' ? '✓' : lesson.inspection === 'fail' ? '✗' : '–'}
            </span>
            <div>
              <span className={`font-semibold ${
                lesson.inspection === 'pass' ? 'text-emerald-700' :
                lesson.inspection === 'fail' ? 'text-red-600' : 'text-slate-500'
              }`}>
                機械検査: {INSPECTION_LABEL[lesson.inspection]}
              </span>
              {lesson.inspection === 'pass' && (
                <p className="text-emerald-600 mt-0.5">8問・各タイプ形式OK・解説あり・禁止語なし</p>
              )}
              {lesson.inspection === 'fail' && (
                <p className="text-red-500 mt-0.5">設問3: 選択肢が3つしかありません（4つ必要）</p>
              )}
            </div>
          </div>
        )}

        {/* 設問一覧 */}
        {lesson.questions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              設問一覧 — {lesson.questions.length} 問
            </h3>
            {lesson.questions.map((q, qIdx) => (
              <button
                key={qIdx}
                onClick={() => onSelectQuestion(0, qIdx)}
                className="w-full text-left border border-stone-200 rounded-xl p-3.5 hover:border-slate-400 hover:bg-stone-50 transition-all group"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 mt-0.5">Q{q.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 font-medium mt-0.5 ${
                    q.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {q.qType === 'four_choice' ? '四択' : '○×'}
                  </span>
                  <span className="text-xs text-slate-700 line-clamp-2 flex-1">{q.text}</span>
                  <span className="text-[10px] text-slate-300 group-hover:text-slate-500 shrink-0 mt-0.5">編集 →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {lesson.status === 'pending' && (
          <div className="text-center py-16 text-slate-300 text-xs space-y-2">
            <div className="text-3xl">○</div>
            <p className="font-medium text-slate-400">未生成</p>
            <p>前のレッスンが「これでよい」になると生成できます。</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 設問編集 ── */
function QuestionEditor({ lesson, lessonIdx, question, qIdx }: {
  lesson: Lesson; lessonIdx: number; question: Question; qIdx: number
}) {
  return (
    <div className="flex flex-col h-full">
      <PaneHeader
        badge={`設問 ${question.id}  /  レッスン ${lessonIdx + 1}`}
        title={lesson.title}
        right={
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
            question.qType === 'four_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {question.qType === 'four_choice' ? '四択' : '○×'}
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">問題文</label>
          <textarea
            defaultValue={question.text}
            rows={3}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        {question.qType === 'four_choice' && question.choices && (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-500 block">選択肢</label>
            {question.choices.map((choice, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  i === question.correct
                    ? 'bg-emerald-500 text-white'
                    : 'bg-stone-200 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <input
                  defaultValue={choice}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                {i === question.correct && (
                  <span className="text-[10px] text-emerald-600 font-semibold shrink-0">正解</span>
                )}
              </div>
            ))}
          </div>
        )}

        {question.qType === 'true_false' && (
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-2">正解</label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <label
                  key={String(val)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${
                    question.answer === val
                      ? val ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span className="text-xl leading-none">{val ? '○' : '×'}</span>
                  <span className="text-xs font-medium">{val ? '正しい' : '誤り'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">解説（2〜3文）</label>
          <textarea
            defaultValue={question.explanation}
            rows={3}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button className="flex-1 bg-slate-800 text-white text-xs py-2.5 rounded-lg hover:bg-slate-700 transition-colors font-medium">
            この設問を更新
          </button>
          <button className="border border-stone-300 text-slate-500 text-xs px-4 py-2.5 rounded-lg hover:bg-stone-50 transition-colors">
            元に戻す
          </button>
        </div>

        <div className="text-center">
          <span className="text-[10px] text-slate-400">
            設問 {qIdx + 1} / {LESSONS[0].questions.length}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── 共通パーツ ── */
function PaneHeader({ badge, title, right, dimmed }: {
  badge: string; title: string; right?: React.ReactNode; dimmed?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 border-b shrink-0 ${dimmed ? 'border-stone-50 bg-stone-50' : 'border-stone-100 bg-white'}`}>
      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wide ${dimmed ? 'bg-stone-100 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
        {badge}
      </span>
      <span className={`text-sm font-semibold flex-1 truncate ${dimmed ? 'text-slate-400' : 'text-slate-800'}`}>
        {title}
      </span>
      {right}
    </div>
  )
}

function GuideField({ label, placeholder, defaultValue, rows = 3, readOnly = false, hint, type = 'textarea' }: {
  label: string; placeholder?: string; defaultValue?: string
  rows?: number; readOnly?: boolean; hint?: string; type?: 'textarea' | 'password'
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 block mb-1">{label}</label>
      {type === 'password' ? (
        <input
          type="password"
          placeholder={placeholder}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      ) : (
        <textarea
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={rows}
          readOnly={readOnly}
          className={`w-full border rounded-lg px-2.5 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 ${
            readOnly ? 'bg-stone-50 border-stone-100 text-slate-500 cursor-default' : 'border-stone-200'
          }`}
        />
      )}
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function FieldView({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-400 mb-0.5">{label}</div>
      <div className="text-xs text-slate-600 whitespace-pre-line">{value}</div>
    </div>
  )
}
