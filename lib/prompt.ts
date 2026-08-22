import type { SeriesGuide, CourseGuide, Lesson } from './types'

export function buildPrompt(
  seriesGuide: SeriesGuide,
  courseTitle: string,
  courseGuide: CourseGuide,
  lessonTitle: string,
  lessonIndex: number,
  approvedLessons: Lesson[],
): { system: string; user: string } {
  const prior = approvedLessons
    .filter(l => l.lessonIndex < lessonIndex)
    .map(l => `レッスン${l.lessonIndex + 1}「${l.title}」（承認済み）`)
    .join('\n')

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

## 前のレッスン（一貫性を保つこと）
${prior || '（なし・このレッスンが最初です）'}

## 今回のレッスン
タイトル: レッスン${lessonIndex + 1}「${lessonTitle}」

## 生成ルール
- 設問は必ず8問
- 四択（four_choice）と○×（true_false）を混ぜる（四択6問・○×2問を目安）
- 四択は同程度の難易度の選択肢4つ、正解は1つ
- 四択の4文は同じ構文・同程度の長さにする。正解にだけ理由や条件を足して長くしない（長さで当たる）。理由は解説に書く
- ○×は「〜である。」で終わる断言形
- 各設問に必ず2〜3文の解説
- 補助概念が記入されている場合はその用語を積極的に使う
- 禁止語（${seriesGuide.forbidden_synonyms}）は絶対に使わない
- 色留袖・付下などを指すときは「品目」を使う。「アイテム」は使わない
- コース1の設問では「品目の格」または「TPO上の格」と書き、裸の「格」だけで問わない（お客様の発言引用のみ例外）
- 「選択品」という語は使わない。所有の変化は「持っていて当然ではない」と書く
- 「相当する洋装はどれか」型の問題は作らない
- コース1レッスン1では、今の格付けが明治〜大正に再構築された事実を1〜2問入れてよい

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
