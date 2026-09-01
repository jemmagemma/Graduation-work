---
name: create-lesson-questions
description: 呉服Quiz工房でレッスン1本を「状態確認→生成→機械チェック→AI品質レビュー→修正→承認」まで仕上げる。固定認識と別人格レビューを先に使う。「レッスンを作る」「問題を作る」「Q{N}を仕上げる」「create-lesson-questions」と依頼された際に使用する。
disable-model-invocation: true
---

# レッスン問題作成

呉服Quiz工房（`http://localhost:3000`）でレッスン1本を仕上げる。アプリ起動済みが前提。

詳細は出稿のたびに再発明しない。

- 固定認識: [locked-principles.md](locked-principles.md)
- レビュー詳細: [review-criteria.md](review-criteria.md)

---

## 会話で揺らさないこと

- ユーザーへの正解番号は **1始まり**。JSON の `correct` だけ **0始まり**
- 表記は **売場**。「売り場」は使わない
- 設問数はコースガイド `question_counts[lessonIndex]`。8問固定ではない。薄い問で枠を埋めるな
- 別人格で「誰が・どこで・何に困っているか」が問題文だけで取れない問が1つでもあるセットは出さない
- 修正案の保存も、承認 API も、ユーザーが言うまで叩かない。内容を「良い」と認められたら保存。承認は「これでよい」「承認」が来るまで待つ
- Windows では `curl` ではなく `node` の `fetch` を使う

---

## STEP 0：起動・状態確認

`GET http://localhost:3000/api/data` を実行する。

- 接続失敗: `pnpm dev` を促して停止する
- 対象コースを確認する。そのコース内で `status: "pending"` かつ `lessonIndex` が最小のレッスンを選ぶ。ユーザーが回を指定していればそれに従う
- 同じコースの1つ前（`lessonIndex - 1`）が `approved` であること。コース内レッスン1はこのチェックをスキップ

---

## STEP 1：ガイド確認

ドリル全体の冠（`data/references/職場ドリル_呉服売場版.md`）と `series.guide` と対象コースの `guide` を見る。空欄なら P2 で記入を促して停止する。学習の型は冠。このシリーズの仕事はシリーズ／コースガイド。冠の成功定義はコース4から設問の主。コース1〜3の承認済みは遡及しない。

コースガイドで必須なのは `lesson_roles` / `must_include` / `exclude` / **`question_counts`**。対象回の `question_counts[lessonIndex]` が無い、または1未満なら、ガイドで問数を宣言してから進む。

その回の仕事は `lesson_roles` が正。シリーズ全体の短い前提（場・規模・意向）と、設問の軸（会場・雰囲気・TPO・和装にしたい理由）は同じ伺いの長短であり、別正解ではない。詳細は [locked-principles.md](locked-principles.md)。

コース2〜5の `question_counts` が `[8, 8, 8]` のままなら仮置き（未グリル）と見る。生成の前に「この回の問数でよいか」を確認する。変えるならコースガイドを先に直す。

### 参照テキスト

レビュー・修正の前に `data/references/` を読む。アプリ生成（`lib/prompt.ts`）も同じフォルダから該当ファイルを初稿に載せる。

1. `data/references/README.md` で一覧を把握する
2. 対象レッスンのテーマに関連するファイルがあれば読む
3. ガイドが正。参照は事実の照合に使う。参照の言い回し（フォーマル度、段の序列、相当する洋装、題材の置き場）を設問に写さない。ドレスコードは引用と解説のみ。正解の名称にするな
4. `kakuzuke-youfuku-hikaku.txt` は生成に載せない。レビューで「相当する洋装」型の確認にだけ使う

---

## STEP 2：レッスン生成

生成はアプリUI経由のみ。初稿には `lib/prompt.ts` が参照を載せる。

1. `http://localhost:3000` を開く
2. ⚙ で API キーを貼る（ページを閉じると消える）
3. P1 で対象レッスンを選ぶ
4. 「このレッスンを生成」を押す

生成後、`GET /api/data` で `status === "draft"` を確認してから次へ進む。

四択6・○×2は生成プロンプト上の目安である。宣言問数が少なければ混ぜなくてよい。

---

## STEP 3：機械チェック

レッスンの `inspection` を見る。

- `pass` → STEP 4
- `fail` → `errors` を報告し STEP 5

| 項目 | ルール |
|------|--------|
| 設問数 | `question_counts[lessonIndex]` と一致 |
| 四択 | 選択肢4つ・`correct` は 0〜3。正解だけが他より8文字以上長いと不合格 |
| ○× | `answer` が `true` か `false` |
| 解説 | 全設問に必須 |
| 禁止語 | フォーマル度・ランク・レベル・ステータス・セミフォーマル・燕尾服・タキシード・カクテルドレス |

---

## STEP 4：AI 品質レビュー

[review-criteria.md](review-criteria.md) の観点とレポート形式で評価する。別人格判定を各問の先頭に書く。

全問 PASS でも STEP 6 には進まない。ユーザーに見せ、修正があれば STEP 5、保存の合図があれば保存してから目視を待つ。

---

## STEP 5：修正

1. 不合格の修正案を出し、承認 / 差し戻し / 別案を待つ
2. 設計語の言い換えで済ませず、学習者の知識・判断に変換する
3. 意味が通じない設問は、誰が・どこで・何に困っているかを文面に書く
4. 参照と矛盾する正解・解説は直す。ガイドと参照が矛盾したらガイドに合わせる
5. ユーザーが保存を認めたら、宣言問数の全設問を API で保存する。API は DB だけを更新する。同じ内容を JSON（`data/kakuto-tpo/courses/.../lessons/lesson-XX.json`）にも書く。API は JSON を書かない

```
POST http://localhost:3000/api/save-lesson
{ "lessonId": "<id>", "questions": [ /* 宣言問数の全設問 */ ] }
```

保存後の `inspection` を確認し、STEP 4 からやり直す。

---

## STEP 6：承認

機械 PASS + AI PASS + ユーザーの「これでよい」「承認」のあと:

```
POST http://localhost:3000/api/approve-lesson
{ "lessonId": "<id>" }
```

次の `pending` が残っていれば STEP 0 に戻る。

---

## Agents Bar 移植メモ

| スキルの STEP | Agents Bar 対応 |
|-------------|----------------|
| STEP 0 | セッション開始時の自動状態チェック |
| STEP 1 | ガイド入力のバリデーション |
| STEP 2 | 「このレッスンを生成」ボタン（既存） |
| STEP 3 | 機械検査（生成直後に自動実行・既存） |
| STEP 4 | AI サブエージェント（設問ごとに並列実行） |
| STEP 5 | インライン設問編集 + 再検査 |
| STEP 6 | 「これでよい」ボタン（既存） |
