/**
 * Normalize story dividers across all trip posts to the canonical pattern:
 *
 *     overview · DIVIDER · [ all day/section blocks ] · DIVIDER · final
 *
 * i.e. a divider only at the two "act" boundaries — after the overview section
 * and before the final-thoughts section. Any divider sitting between day
 * sections is removed; a missing act-boundary divider is added.
 *
 * Section headers (dayEntry) already carry the day-to-day breaks, so the ✦
 * dividers are reserved for the major narrative transitions.
 *
 * Dry run (default): node scripts/normalize-dividers.mjs
 * Apply:             node scripts/normalize-dividers.mjs --apply
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let projectId, dataset = 'production', token
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const [k, v] = line.split('='); const key = k?.trim()
  if (key === 'PUBLIC_SANITY_PROJECT_ID') projectId = v?.trim()
  if (key === 'PUBLIC_SANITY_DATASET')    dataset = v?.trim() ?? dataset
  if (key === 'SANITY_WRITE_TOKEN')        token = v?.trim()
}
if (!projectId || !token) { console.error('❌  Missing project id / token in .env'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })
const APPLY = process.argv.includes('--apply')

let _n = 0
const newKey = () => `k${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

function rebuild(story, template) {
  const isDivider = (b) => b?.type === 'divider'
  const isSection = (b) => b?.type === 'dayEntry'
  const kindOf   = (b) => b?.eyebrowKind ?? 'day'

  const overviewIdx = story.findIndex(b => isSection(b) && kindOf(b) === 'overview')
  const finalIdx    = story.findIndex(b => isSection(b) && kindOf(b) === 'final')
  // first section block AFTER overview that is itself not the overview
  let firstAfterOverview = -1
  if (overviewIdx !== -1) {
    for (let i = overviewIdx + 1; i < story.length; i++) {
      if (isSection(story[i]) && kindOf(story[i]) !== 'overview') { firstAfterOverview = i; break }
    }
  }

  const insertBefore = new Set()
  if (firstAfterOverview !== -1) insertBefore.add(firstAfterOverview)
  if (finalIdx !== -1)           insertBefore.add(finalIdx)

  const mkDivider = () => template
    ? { ...template, _key: newKey() }
    : { _type: 'storyBlock', _key: newKey(), type: 'divider' }

  const out = []
  story.forEach((b, i) => {
    if (insertBefore.has(i)) out.push(mkDivider())
    if (isDivider(b)) return  // drop every original divider
    out.push(b)
  })
  return out
}

function shape(story) {
  return story.map((b, i) => {
    if (b.type === 'divider') return `[${i}]DIV`
    if (b.type === 'dayEntry') return `[${i}]${b.eyebrowKind ?? 'day'}`
    return null
  }).filter(Boolean).join(' ')
}

const trips = await client.fetch(`*[_type=="trip"]|order(id.current asc){ _id, "slug":id.current, story }`)
console.log(`\n${APPLY ? '✍️  APPLYING' : '🔍  DRY RUN'} — divider normalization across ${trips.length} trips\n`)

let changed = 0
for (const t of trips) {
  const story = t.story ?? []
  const template = story.find(b => b.type === 'divider') ?? null
  const next = rebuild(story, template)

  const before = shape(story)
  const after  = shape(next)
  if (before === after && story.length === next.length) {
    console.log(`✓  ${t.slug.padEnd(20)} unchanged`)
    continue
  }
  changed++
  console.log(`•  ${t.slug}`)
  console.log(`     before: ${before}`)
  console.log(`     after:  ${after}`)

  if (APPLY) {
    const doc = await client.fetch(`*[_id==$id][0]`, { id: t._id })
    const newDoc = { ...doc, story: next }
    delete newDoc._rev; delete newDoc._createdAt; delete newDoc._updatedAt
    await client.createOrReplace(newDoc)
    console.log(`     ✅ saved (${next.length} blocks)`)
  }
}

console.log(`\n${changed} trip(s) ${APPLY ? 'updated' : 'would change'}.\n`)
