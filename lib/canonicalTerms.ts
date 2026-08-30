import type { Question, SeriesGuide } from './types'

export const DEFAULT_CANONICAL_TERMS = `付下 ← 付け下げ, 附下, 付下げ
きもの ← 着物
ゆかた ← 浴衣
なごや帯 ← 名古屋帯
売場 ← 売り場
帯締め ← 帯締
帯揚げ ← 帯揚`

export const DEFAULT_REWRITE_EXCLUSIONS = 'お着物'

export type CanonicalChange = {
  canonical: string
  alias: string
  count: number
}

export type CanonicalRewriteReport = {
  changes: CanonicalChange[]
  total: number
}

type KeepOp = { kind: 'keep'; needle: string }
type ReplaceOp = {
  kind: 'replace'
  needle: string
  to: string
  canonical: string
  alias: string
}
type Op = KeepOp | ReplaceOp

const ARROW = /\s*(?:←|<-|⇐)\s*/

export function emptyCanonicalRewriteReport(): CanonicalRewriteReport {
  return { changes: [], total: 0 }
}

export function normalizeSeriesGuide(guide: SeriesGuide): SeriesGuide {
  return {
    ...guide,
    canonical_terms: guide.canonical_terms ?? DEFAULT_CANONICAL_TERMS,
    rewrite_exclusions: guide.rewrite_exclusions ?? DEFAULT_REWRITE_EXCLUSIONS,
  }
}

export function formatCanonicalRewriteReport(
  report: CanonicalRewriteReport | null | undefined,
): string {
  if (!report || report.total === 0) return ''
  const pairs = report.changes
    .filter(c => c.count > 0)
    .map(c => `${c.canonical} ← ${c.alias} ×${c.count}`)
    .join(' ／ ')
  return `${pairs}（計${report.total}箇所）`
}

export function mergeCanonicalReports(
  reports: CanonicalRewriteReport[],
): CanonicalRewriteReport {
  const byKey = new Map<string, CanonicalChange>()
  for (const report of reports) {
    for (const change of report.changes) {
      if (change.count <= 0) continue
      const key = `${change.canonical}\0${change.alias}`
      const prev = byKey.get(key)
      if (prev) prev.count += change.count
      else byKey.set(key, { ...change })
    }
  }
  const changes = [...byKey.values()]
  return {
    changes,
    total: changes.reduce((sum, c) => sum + c.count, 0),
  }
}

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[・、，,\n]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export function parseCanonicalTerms(
  raw: string | undefined,
): { canonical: string; aliases: string[] }[] {
  if (!raw?.trim()) return []
  const rules: { canonical: string; aliases: string[] }[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.split(ARROW)
    if (parts.length < 2) continue
    const canonical = parts[0].trim()
    const aliases = parseList(parts.slice(1).join(','))
      .filter(alias => alias && alias !== canonical)
    if (!canonical || aliases.length === 0) continue
    rules.push({ canonical, aliases })
  }
  return rules
}

function buildOps(guide: SeriesGuide): Op[] {
  const ops: Op[] = []
  for (const needle of parseList(guide.rewrite_exclusions)) {
    ops.push({ kind: 'keep', needle })
  }
  for (const rule of parseCanonicalTerms(guide.canonical_terms)) {
    ops.push({ kind: 'keep', needle: rule.canonical })
    for (const alias of rule.aliases) {
      ops.push({
        kind: 'replace',
        needle: alias,
        to: rule.canonical,
        canonical: rule.canonical,
        alias,
      })
    }
  }
  ops.sort((a, b) => {
    if (b.needle.length !== a.needle.length) return b.needle.length - a.needle.length
    if (a.kind !== b.kind) return a.kind === 'keep' ? -1 : 1
    return 0
  })
  return ops.filter(op => op.needle.length > 0)
}

export function rewriteText(
  text: string,
  ops: Op[],
): { text: string; counts: Map<string, CanonicalChange> } {
  const counts = new Map<string, CanonicalChange>()
  if (!text || ops.length === 0) return { text, counts }

  let out = ''
  let i = 0
  while (i < text.length) {
    let matched: Op | undefined
    for (const op of ops) {
      if (text.startsWith(op.needle, i)) {
        matched = op
        break
      }
    }
    if (!matched) {
      out += text[i]
      i += 1
      continue
    }
    if (matched.kind === 'keep') {
      out += matched.needle
      i += matched.needle.length
    } else {
      out += matched.to
      i += matched.needle.length
      const key = `${matched.canonical}\0${matched.alias}`
      const prev = counts.get(key)
      if (prev) prev.count += 1
      else {
        counts.set(key, {
          canonical: matched.canonical,
          alias: matched.alias,
          count: 1,
        })
      }
    }
  }
  return { text: out, counts }
}

function reportFromCounts(counts: Map<string, CanonicalChange>): CanonicalRewriteReport {
  const changes = [...counts.values()]
  return {
    changes,
    total: changes.reduce((sum, c) => sum + c.count, 0),
  }
}

function mergeCountMaps(
  into: Map<string, CanonicalChange>,
  from: Map<string, CanonicalChange>,
): void {
  for (const [key, change] of from) {
    const prev = into.get(key)
    if (prev) prev.count += change.count
    else into.set(key, { ...change })
  }
}

export function rewriteQuestions(
  questions: Question[],
  guide: SeriesGuide,
): { questions: Question[]; report: CanonicalRewriteReport } {
  const ops = buildOps(guide)
  if (ops.length === 0) {
    return { questions, report: emptyCanonicalRewriteReport() }
  }

  const allCounts = new Map<string, CanonicalChange>()
  const next = questions.map(q => {
    const text = rewriteText(q.text ?? '', ops)
    mergeCountMaps(allCounts, text.counts)

    const explanation = rewriteText(q.explanation ?? '', ops)
    mergeCountMaps(allCounts, explanation.counts)

    let choices = q.choices
    if (choices) {
      choices = choices.map(choice => {
        const rewritten = rewriteText(choice, ops)
        mergeCountMaps(allCounts, rewritten.counts)
        return rewritten.text
      })
    }

    return {
      ...q,
      text: text.text,
      explanation: explanation.text,
      ...(choices ? { choices } : {}),
    }
  })

  return { questions: next, report: reportFromCounts(allCounts) }
}
