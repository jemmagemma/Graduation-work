---
name: create-course-guide
description: 呉服Quiz工房のコースガイドをgrill-meスタイルで対話しながら作成し、APIで保存する。問数はレッスン順に宣言する（8問固定ではない）。「コースガイドを作る」「コースを作成する」「create-course-guide」と依頼された際に使用する。
disable-model-invocation: true
---

# コースガイド作成

シリーズガイドを参照しながら1問ずつ質問し、コースガイドの叩き台を作って保存する。叩き台は素材。最終判断は人間が行う。

固定認識: [../create-lesson-questions/locked-principles.md](../create-lesson-questions/locked-principles.md)

---

## 前提確認

`GET http://localhost:3000/api/data` を実行する。

- 接続失敗 → `pnpm dev` を促して停止する
- `series.guide` が空 → 先に `create-series-guide` を促して停止する
- 対象コースを確認する。既存ガイドがあれば内容を出して上書き確認する（`question_counts` も含める）

Windows では `curl` ではなく `node` の `fetch` を使う。

---

## 質問ステップ（1問ずつ）

始める前にシリーズの `purpose` を引用する。

```
シリーズの目的は：「{series.guide.purpose}」

このコースはその目的のうち、どの部分を担当しますか？
```

薄い回答は深掘りしてから次へ進む。各レッスンの仕事は標語ではなく、学習者がその回で身につける判断で書く。コース1レッスン3は所有の標語ではなく前提合わせである（固定認識を見る）。

| # | 質問 | フィールド |
|---|------|----------|
| Q1 | 「このコースの各レッスンはどんな役割分担にしますか？シリーズの目的に照らして、各レッスンが接客のどの場面に対応するかも教えてください」 | `lesson_roles` |
| Q2 | 「このコースで受講者に必ず理解させたい概念・知識は何ですか？」 | `must_include` |
| Q3 | 「前のレッスンで出てきた概念を後のレッスンに自然に再登場させたい場合、どの概念をどのタイミングで出しますか？」 | `revisit` |
| Q4 | 「このコースで扱わない・扱いたくない内容はありますか？」 | `exclude` |
| Q5 | 「このコースを修了した受講者の状態を一文で表すとどうなりますか？」 | `completion` |
| Q6 | 「各レッスンの設問数を、レッスン順に宣言してください。8問固定ではありません。論点の薄い回は少なくてよい。枠を埋めるための薄い問は足しません。（例：コース1は 8, 8, 4）」 | `question_counts` |

`question_counts` は整数の配列。レッスン数と長さを揃える。未宣言の回は検査不合格になる。

---

## 叩き台の出力と確認

```
【コースガイド 叩き台】

■ レッスン役割分担
{lesson_roles}

■ 必須内容
{must_include}

■ 復習の組み込み方針
{revisit}

■ 除外する内容
{exclude}

■ 修了後の姿
{completion}

■ 各レッスンの設問数
{question_counts をカンマ区切り}
```

「このまま保存しますか？修正したい箇所があれば教えてください。」
修正があれば直して再表示する。

---

## 保存

「保存する」と承認を得たら API を呼ぶ。API は DB だけを更新する。同じ内容を JSON（`data/kakuto-tpo/courses/.../course.json`）にも書く。

```
POST http://localhost:3000/api/save-guide
{
  "type": "course",
  "courseId": "<対象コースのid>",
  "guide": {
    "lesson_roles": "...",
    "must_include": "...",
    "revisit": "...",
    "exclude": "...",
    "completion": "...",
    "question_counts": [<レッスン数と同じ長さの整数>]
  }
}
```

保存後: 「コースガイドを保存しました。次は `create-lesson-questions` でレッスン問題を作成できます。」
