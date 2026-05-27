/**
 * One-time migration: turn the four previously-hardcoded homepage sections
 * (Narrows, Aurora, Arctic Dawn, Jungle) into curated "featured" trips, moving
 * their copy into the new feature fields so the home page keeps its look.
 *
 * Usage: SANITY_WRITE_TOKEN=skXXX node scripts/migrate-featured.mjs
 * (token also read from .env). Idempotent — re-running just re-sets the fields.
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
    const i = line.indexOf('=')
    if (i === -1) continue
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim()
    if (k === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v
    if (k === 'PUBLIC_SANITY_DATASET'   && !process.env.PUBLIC_SANITY_DATASET) dataset = v || dataset
    if (k === 'SANITY_WRITE_TOKEN'      && !token) token = v
  }
} catch {}

if (!projectId || !token) { console.error('❌  Missing project id or write token'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

const FEATURES = {
  'the-narrows': {
    featureLayout: 'text-right',
    featureOrder: 1,
    featureBlurb: 'Knee-deep in the Virgin River, slot canyon walls closing to six feet wide overhead. The light never reaches the floor directly — it bounces off sandstone and arrives already ancient, already amber.',
  },
  'aurora-borealis': {
    featureLayout: 'text-left',
    featureOrder: 2,
    featureBlurb: 'At 2am in a frozen field, the sky collapsed into light. Curtains of green plasma swept the horizon — charged particles colliding with the upper atmosphere, making the invisible visible for a few breathless hours.',
  },
  'arctic-dawn': {
    featureLayout: 'text-right',
    featureOrder: 3,
    featureBlurb: 'Pink clouds streaked over a frozen river valley, the mountain range catching the first light before anything else — peaks igniting one by one as the temperature held well below zero.',
  },
  'jungle-falls': {
    featureLayout: 'color-quote',
    featureOrder: 4,
    featureBlurb: 'The forest floor was permanent dusk. Mist drifted in from the cascade and settled on every leaf. Nothing moved quickly here — the jungle runs on its own logic, its own deep time.',
    featureQuote: 'The waterfall had no beginning we could find — it simply arrived, white and absolute, from somewhere above the canopy.',
  },
}

const docs = await client.fetch(
  '*[_type == "trip" && id.current in $slugs]{ _id, "slug": id.current }',
  { slugs: Object.keys(FEATURES) },
)
console.log(`Found ${docs.length} matching document(s) (incl. drafts).\n`)

let patched = 0
for (const doc of docs) {
  const f = FEATURES[doc.slug]
  if (!f) continue
  await client.patch(doc._id).set({ featured: true, ...f }).commit()
  patched++
  console.log(`✓ ${doc._id} — featured (${f.featureLayout}, order ${f.featureOrder})`)
}
console.log(`\nDone. Patched ${patched} document(s).`)
