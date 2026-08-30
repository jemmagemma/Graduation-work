---
name: create-series-guide
description: 呉服Quiz工房のシリーズガイドをgrill-meスタイルで対話しながら作成し、APIで保存する。「シリーズガイドを作る」「シリーズを作成する」「create-series-guide」と依頼された際に使用する。
disable-model-invocation: true
---

# シリーズガイド作成

1問ずつ質問して叩き台を作り、人間が確認してから API で保存する。叩き台は素材。最終判断は人間が行う。

固定認識: [../create-lesson-questions/locked-principles.md](../create-lesson-questions/locked-principles.md)
設問数はシリーズでは決めない。コースガイドの `question_counts` で宣言する。

---

## 前提確認

`GET http://localhost:3000/api/data` を実行する。

- 接続失敗 → `pnpm dev` を促して停止する
- 既存ガイドがあれば内容を出して上書き確認する

Windows では `curl` ではなく `node` の `fetch` を使う。

---

## 質問ステップ（1問ずつ）

薄い回答は深掘りしてから次へ進む。補助語は例えであり、学習者に名称を答えさせる設計にしない。所有の変化をレッスンの標語にしない。舞台の表記は売場。

| # | 質問 | フィールド |
|---|------|----------|
| Q1 | 「このシリーズを終えた受講者が、接客の場面でどんな行動ができるようになってほしいですか？また、実際の接客経験とどう組み合わせるイメージですか？」 | `purpose` |
| Q2 | 「このシリーズで必ず登場させたいキーワードや概念を挙げてください（複数可）」 | `terms` |
| Q3 | 「このシリーズに、Claude に積極的に使わせたい中心的な分類概念・補助語はありますか？（例：格とTPOなら規定演技／自由演技。ない場合は空欄でOK）」 | `aux_concept` |
| Q4 | 「使ってはいけない言葉・表現はありますか？（フォーマル度・ランク・レベル・セミフォーマルはすでに禁止済みです。追加があれば）」 | `forbidden_synonyms` |
| Q4b | 「同じものを指す語で、正表記に揃えたいものはありますか？1行が1グループ（例: 付下 ← 付け下げ, 附下）。なければ空でよい」 | `canonical_terms` |
| Q4c | 「置換したくない文字列はありますか？（例: お着物。なければ空でよい）」 | `rewrite_exclusions` |
| Q5 | 「特殊ケースや例外として受講者に伝えたい知識はありますか？（お客様から聞かれて詰まりやすい場面や、単純な分類では収まらないグレーゾーンがあれば）」 | `exceptions` |
| Q6 | 「問題文はどんな言葉づかい・トーンで書いてほしいですか？（舞台は呉服売場。例：お客様が目の前にいる場面・ですます調・短文）」 | `writing_style` |
| Q7 | 「このシリーズの問題を解くとき、受講者はどんなお客様・どんな状況を想定してほしいですか？典型的な場面を1つ具体的に描写してください」 | `purpose` + `writing_style` に反映 |

---

## 叩き台の出力と確認

```
【シリーズガイド 叩き台】

■ 習得目標
{purpose}

■ 主要語句
{terms}

■ 補助概念（任意）
{aux_concept}

■ 禁止同義語
{forbidden_synonyms}（フォーマル度・ランク・レベル・セミフォーマルを含む）

■ 統一語
{canonical_terms}

■ 置換しない語
{rewrite_exclusions}

■ 例外・注意事項
{exceptions}

■ 文体・トーン
{writing_style}
```

「このまま保存しますか？修正したい箇所があれば教えてください。」
修正があれば直して再表示する。

---

## 保存

「保存する」と承認を得たら API を呼ぶ。API は DB だけを更新する。同じ内容を JSON（`data/kakuto-tpo/series.json`）にも書く。シリーズガイド保存は、統一語に従って全レッスンの設問表記を揃える（承認は維持。検査不合格にはしない）。

```
POST http://localhost:3000/api/save-guide
{
  "type": "series",
  "guide": {
    "purpose": "...",
    "terms": "...",
    "aux_concept": "（なければ空文字）",
    "forbidden_synonyms": "フォーマル度・ランク・レベル・セミフォーマル（追加分があればここに）",
    "canonical_terms": "付下 ← 付け下げ, 附下, 付下げ",
    "rewrite_exclusions": "お着物",
    "exceptions": "...",
    "writing_style": "..."
  }
}
```

保存後: 「シリーズガイドを保存しました。次は `create-course-guide` でコースガイドを作成できます。」
