import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(process.cwd(), 'data', 'references')

/** ドリル全体の冠。学習の型。事実摘録ではない。レッスン名では選ばない */
const CROWN = '職場ドリル_呉服売場版.md'

/** 事実ブロックに載せない。洋装誘発の摘録と、別枠で先頭に載せる冠 */
const EXCLUDE_FROM_GENERATION = new Set(['kakuzuke-youfuku-hikaku.txt', CROWN])

const ALWAYS = [
  'kakuzuke-5kaisou-kanzen-gaido.txt',
  'kakuzuke-some-4group-7shu.txt',
]

const BY_THEME: { test: RegExp; files: string[] }[] = [
  {
    test: /黒留袖|色留袖|留袖|主催/,
    files: ['ichi-reisou-kurotomesode.txt', 'iro-tomesode-kiso.txt'],
  },
  {
    test: /振袖/,
    files: ['hare-ke-daihakkai-furisode.txt'],
  },
  {
    test: /訪問着|付下|色無地|あいだ/,
    files: ['hatsugama-sotsunyugakushiki.txt', 'kekkonshiki-tachiba.txt'],
  },
  {
    test: /黒留袖|色留袖|留袖|主催|振袖/,
    files: ['kekkonshiki-tachiba.txt'],
  },
  {
    test: /地図|自由演技|紬|小紋/,
    files: ['kajuaru-fomaru-shuyaku.txt'],
  },
  {
    test: /江戸小紋|江戸三役|小紋| 色無地$/,
    files: ['edo-sanyaku.txt'],
  },
  {
    test: /小紋/,
    files: ['komon.txt'],
  },
  {
    test: /紬|お召|御召/,
    files: ['tsumugi-omeshi.txt'],
  },
  {
    test: /家紋|紋で格|格を調整して提案する 紋/,
    files: ['kamon-chado.txt', 'kamon-kiso.txt'],
  },
  {
    test: /素材|羽二重|縮緬/,
    files: ['sozai-kaku-teire.txt', 'some-ori.txt'],
  },
  {
    test: /帯で格|袋帯|名古屋帯|格を調整して提案する 帯/,
    files: ['obi-kakuawase.txt', 'nagoya-obi.txt'],
  },
  {
    test: /小物で格|帯締め|帯揚げ|格を調整して提案する 小物/,
    files: ['obijime-obiage.txt'],
  },
  {
    test: /紋付|黒紋付|色紋付|紬と素材/,
    files: ['dansei-kimono.txt'],
  },
  {
    test: /街着|ゆかた|浴衣/,
    files: ['yukata-tpo.txt'],
  },
]

export function loadCrownGuide(): string {
  const path = join(DIR, CROWN)
  if (!existsSync(path)) return '（未配置）'
  return readFileSync(path, 'utf8').trim()
}

export function selectReferenceFiles(courseTitle: string, lessonTitle: string): string[] {
  const hay = `${courseTitle} ${lessonTitle}`
  const set = new Set(ALWAYS)
  for (const { test, files } of BY_THEME) {
    if (test.test(hay)) files.forEach(f => set.add(f))
  }
  return [...set].filter(f => !EXCLUDE_FROM_GENERATION.has(f))
}

export function loadReferencesForLesson(courseTitle: string, lessonTitle: string): string {
  const parts: string[] = []
  for (const name of selectReferenceFiles(courseTitle, lessonTitle)) {
    const path = join(DIR, name)
    if (!existsSync(path)) continue
    parts.push(`### ${name}\n${readFileSync(path, 'utf8').trim()}`)
  }
  return parts.length > 0 ? parts.join('\n\n') : '（該当なし）'
}
