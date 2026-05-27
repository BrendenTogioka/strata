/**
 * One-off: fill in missing short descriptions + trip titles (H1) for trips.
 * Only sets fields that are currently empty, so it won't overwrite your edits.
 *
 * Usage: SANITY_WRITE_TOKEN=skXXX node scripts/migrate-copy.mjs
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const i = line.indexOf('='); if (i === -1) continue
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim()
    if (k === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v
    if (k === 'PUBLIC_SANITY_DATASET'   && !process.env.PUBLIC_SANITY_DATASET) dataset = v || dataset
    if (k === 'SANITY_WRITE_TOKEN'      && !token) token = v
  }
} catch {}
if (!projectId || !token) { console.error('❌  Missing project id or write token'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

const COPY = {
  'valley-of-fire': {
    storyTitle: 'Jurassic Sandstone at Golden Hour',
    description: "150-million-year-old dunes turned to waves of red sandstone that blaze at golden hour — two days in Nevada's oldest state park.",
  },
  'the-narrows': {
    storyTitle: 'Sixteen Miles Up the Virgin River',
    description: 'Sixteen miles of slot-canyon wading where the Virgin River is the only trail and the walls close to six feet apart.',
  },
  'aurora-borealis': {
    storyTitle: 'Five Nights Chasing the Northern Lights',
    description: 'Five nights under Arctic skies near Tromsø, waiting for the green curtains of the aurora to break open overhead.',
  },
  'arctic-dawn': {
    storyTitle: 'First Light on a Frozen Yukon Valley',
    description: 'Three days on a frozen Yukon river, each move planned around six hours of winter light and peaks that ignite at dawn.',
  },
  'havasupai-falls': {
    storyTitle: 'Ten Miles to Turquoise Water',
    description: 'Twenty miles into the Grand Canyon to reach travertine pools the color of glacial melt, fed by springs that run year-round.',
  },
  'jungle-falls': {
    storyTitle: 'Into the Permanent Dusk of the Canopy',
    description: "A humid day's walk through Southeast Asian rainforest to a waterfall that arrives white and absolute from above the canopy.",
  },
  'havasupai-trip-report-4-days-40-miles-turquoise-water-long-miles-and-one-late-night-climb': {
    storyTitle: 'Four Days, Forty Miles Through Buckskin Gulch',
    description: 'Four days and forty miles through Buckskin Gulch — endless slot-canyon walls, long miles, and one climb finished after dark.',
  },
}

// Guard: descriptions must fit the 140-char Studio limit
for (const [slug, c] of Object.entries(COPY)) {
  if (c.description.length > 140) {
    console.error(`❌  description too long (${c.description.length}) for ${slug}`); process.exit(1)
  }
}

const docs = await client.fetch(
  '*[_type == "trip" && id.current in $slugs]{ _id, "slug": id.current, description, storyTitle }',
  { slugs: Object.keys(COPY) },
)
console.log(`Found ${docs.length} document(s) (incl. drafts).\n`)

let patched = 0
for (const doc of docs) {
  const c = COPY[doc.slug]; if (!c) continue
  const set = {}
  if (!doc.description) set.description = c.description
  if (!doc.storyTitle)  set.storyTitle  = c.storyTitle
  if (!Object.keys(set).length) { console.log(`• ${doc._id} — already has copy, skipped`); continue }
  await client.patch(doc._id).set(set).commit()
  patched++
  console.log(`✓ ${doc._id} — set ${Object.keys(set).join(' + ')} (desc ${set.description?.length ?? '—'} chars)`)
}
console.log(`\nDone. Patched ${patched} document(s).`)
