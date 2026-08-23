import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(process.cwd(), 'data', 'references')

/** 生成に載せない。相当する洋装の問題を誘発するため */
const EXCLUDE_FROM_GENERATION = new Set(['kakuzuke-youfuku-hikaku.txt'])

const ALWAYS = [
  'kakuzuke-5kaisou-kanzen-gaido.txt',
  'kakuzuke-some-4group-7shu.txt',
]

const BY_THEME: { test: RegExp; files: string[] }[] = [
  {
    test: /黒留袖|色留袖|留袖|主催/,
    files: ['ichi-reisou-kurotomesode.txt', 'iro-tomesode-kiso.txt'],
  },
]

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
