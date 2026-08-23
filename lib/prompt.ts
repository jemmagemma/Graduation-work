import type { SeriesGuide, CourseGuide, Lesson, Question } from './types'
import { declaredQuestionCount } from './questionCount'
import { loadReferencesForLesson } from './references'

export type FailedReplace = {
  keep: Question[]
  failed: { question: Question; errors: string[] }[]
}

function formatQuestion(q: Question): string {
  const lines = [
    `id: ${q.id}`,
    `qType: ${q.qType}`,
    `text: ${q.text}`,
  ]
  if (q.qType === 'four_choice') {
    lines.push(`choices: ${JSON.stringify(q.choices ?? [])}`)
    lines.push(`correct: ${q.correct}`)
  } else {
    lines.push(`answer: ${q.answer}`)
  }
  lines.push(`explanation: ${q.explanation}`)
  return lines.join('\n')
}

export function buildPrompt(
  seriesGuide: SeriesGuide,
  courseTitle: string,
  courseGuide: CourseGuide,
  lessonTitle: string,
  lessonIndex: number,
  approvedLessons: Lesson[],
  replaceFailed?: FailedReplace,
): { system: string; user: string } {
  const count = declaredQuestionCount(courseGuide, lessonIndex)
  const countLabel = replaceFailed
    ? `${replaceFailed.failed.length}問（不合格のみ。合格分は返すな）`
    : count === null ? '（コースガイドに問数が未宣言）' : `${count}問`

  const replaceSection = replaceFailed
    ? `
## 再生成の範囲
検査不合格の設問だけを作り直す。合格した設問は一字も変えるな。返す questions は不合格の数だけ。id は指定どおり。

## 残す設問（変えるな。同じシナリオ・同じ論点を繰り返すな）
${replaceFailed.keep.length > 0
    ? replaceFailed.keep.map(q => formatQuestion(q)).join('\n\n')
    : '（なし）'}

## 作り直す設問
${replaceFailed.failed.map(({ question, errors }) =>
      `不合格理由: ${errors.join(' / ')}\n${formatQuestion(question)}`
    ).join('\n\n')}
`
    : ''

  const prior = approvedLessons
    .filter(l => l.lessonIndex < lessonIndex)
    .map(l => `レッスン${l.lessonIndex + 1}「${l.title}」（承認済み）`)
    .join('\n')

  const isMapLesson3 = lessonIndex === 2 && courseTitle.includes('地図')
  const mapLesson3Rules = isMapLesson3
    ? `- この回の仕事は前提合わせである。会場・雰囲気・TPO・和装にしたい理由を伺ってから見立てる。所有や昭和様式そのものを問うな。背景は、家の本のようなお客様の決めつけとして出す\n`
    : ''

  const system = `あなたは百貨店呉服部の専門家として、販売員研修用ドリルの設問を作成します。
指定されたJSONスキーマのみを返してください。説明文・マークダウン・コードブロックは不要です。`

  const user = `## シリーズガイド「品目の格とTPO」
目的: ${seriesGuide.purpose || '（未記入）'}
使う用語: ${seriesGuide.terms || '（未記入）'}
補助概念（任意）: ${seriesGuide.aux_concept || '（なし）'}
禁止する言い換え: ${seriesGuide.forbidden_synonyms}
例外: ${seriesGuide.exceptions || '（未記入）'}
文体: ${seriesGuide.writing_style || '（未記入）'}

## コースガイド「${courseTitle}」
各レッスンの役割: ${courseGuide.lesson_roles || '（未記入）'}
各回で必ず出すこと: ${courseGuide.must_include || '（未記入）'}
後のレッスンで再登場させること: ${courseGuide.revisit || '（未記入）'}
含めないこと: ${courseGuide.exclude}
完了条件: ${courseGuide.completion || '（未記入）'}
設問数（レッスン順）: ${(courseGuide.question_counts ?? []).join(', ') || '（未宣言）'}
今回の設問数: ${countLabel}

## 前のレッスン（一貫性を保つこと）
${prior || '（なし・このレッスンが最初です）'}

## 今回のレッスン
タイトル: レッスン${lessonIndex + 1}「${lessonTitle}」

## 参照テキスト（事実の照合用。語や範囲はガイドが正）
${loadReferencesForLesson(courseTitle, lessonTitle)}
${replaceSection}
## 生成ルール
- 問題文は、ガイドを知らない人が初めて読んでも、誰が・どこで・何の用件かが文面だけで分かること。「黒留袖を持っていないのですが、結婚式に出られますか。」は、誰の発言か・出るとは装いかが取れず不可。呉服売場であること、お客様の用件、困っている点を文に書く。「売場」と書き、「売り場」は使わない
- 設問数は今回の設問数（${countLabel}）に合わせる。8問固定ではない。枠を埋めるための薄い問を足すな
- 四択（four_choice）と○×（true_false）を混ぜてよい。四択6問・○×2問は目安でありノルマではない。宣言問数が少なければ四択のみでよい
- 四択は同程度の難易度の選択肢4つ、正解は1つ
- 四択の4文は同じ構文・同程度の長さにする。正解にだけ理由や条件を足して長くしない（長さで当たる）。理由は解説に書く
- ダミーは一目で落とせない、現場でありそうな誤りにする。呉服の早見表としては正しく見えうる決めつけを置け。例：続柄なら一択、既婚か未婚かを伺う、着用頻度で勧否を決める、家の本の通りに用意する。既婚か未婚かは、今はプライベートであり失礼・クレームのリスクがある。正解の伺いは、会場・雰囲気・TPO・和装にしたい理由である。昔の前提なら色留袖一択もあながち間違いではないが、平服の場に第一礼装は調和せず敬意につながらないことがある。価格ダミーはそのレッスンで多くても1問
- 所有や昭和の変化そのものを問うな。根拠にならない情報を問題文に足すな。参照の一面だけを拾って標語の問いにするな
${mapLesson3Rules}- ○×は「〜である。」で終わる断言形
- 各設問に必ず2〜3文の解説
- 規定演技／自由演技はドリル内の例えである。正解にその名称を要求するな。解説で「決まりの多い側をここでは規定演技と呼ぶ」と共有してよい。問うのは、形式と敬いの論理、洒落ものの制約である。ファッション延長（ブーツ合わせ、襦袢の代わりのTシャツ）はこのシリーズでは扱わない。紬に金の袋帯は洒落ものから外れた装いである。メタファーはフォーマル導入用であり、自由側との対比を無理に完成させない
- 禁止語（${seriesGuide.forbidden_synonyms}）は絶対に使わない
- 色留袖・付下などを指すときは「品目」を使う。「アイテム」は使わない
- コース1の設問では「品目の格」または「TPO上の格」と書き、裸の「格」だけで問わない（お客様の発言引用のみ例外）
- 「選択品」という語は使わない
- 「相当する洋装はどれか」型の問題は作らない
- コース1レッスン1では、今の格付けが明治〜大正に再構築された事実を1〜2問入れてよい
- 問題文が正解を漏らさない。続柄や式の規模を先に書くと「何を聞くか」が成立しない
- このレッスンより後の補助語（例：コース1レッスン1での規定演技／自由演技）を問題文・選択肢・解説に出さない
- 聞いていることと正解の軸を揃える。「何で決まるか」に「何のためか」で答えない
- 「姪の結婚式」など同じ固有シナリオを、コース内で繰り返さない
- 設問は学習者が売場で使う知識・判断を問う。このシリーズ／コース／レッスンの設計（唯一の補助語、押さえる範囲、後のコースの題材か、どう位置づけるか）を問う問題は作らない。解説で「後のコースで扱う」と先送りするのは可
- 「この場は規定寄りか自由寄りか」の選択肢を「規定演技／自由演技」にするな。決まりの多い装いが要るか、形式の緩い装いで足りるかを、売場の言葉で問う
- 参照テキストは事実（柄の位置、袖の長さ、既婚・未婚、代表品目）の根拠にする。レンズ・出題範囲・禁止語はガイドが正。参照の言い回し（フォーマル度、段の序列、相当する洋装、題材の置き場）を設問に写さない

## 出力JSON（このJSONのみ返すこと。他のテキストは一切不要）
{
  "questions": [
    {
      "id": 1,
      "qType": "four_choice",
      "text": "問題文",
      "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correct": 0,
      "explanation": "解説文（2〜3文）"
    },
    {
      "id": 2,
      "qType": "true_false",
      "text": "文（〜である。で終わる）",
      "answer": true,
      "explanation": "解説文（2〜3文）"
    }
  ]
}`

  return { system, user }
}
