/**
 * One-off: seed orderRank on currently-featured trips so they preserve their
 * existing order under the new orderable-document-list plugin, and clean off
 * the now-removed featureOrder field from every trip document.
 *
 * Run once: SANITY_WRITE_TOKEN=skXXX node scripts/migrate-orderrank.mjs
 */

import { createClient } from '@sanity/client'
import { LexoRank } from 'lexorank'
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

// Fetch featured trips in their CURRENT order (featureOrder asc, undefined last by tripDate desc)
const featured = await client.fetch(
  '*[_type=="trip" && featured==true] | order(featureOrder asc, tripDate desc){ _id, "slug": id.current, featureOrder, orderRank }',
)
console.log(`Featured trips found: ${featured.length}`)

// Generate ascending LexoRank values starting at middle so future inserts (drag) work both sides
let rank = LexoRank.middle()
for (const t of featured) {
  if (t.orderRank) { console.log(`• ${t.slug} already has orderRank, skipping`); continue }
  const value = rank.toString()
  await client.patch(t._id).set({ orderRank: value }).commit()
  console.log(`✓ ${t.slug} → orderRank ${value}`)
  rank = rank.genNext()
}

// Clean up: featureOrder is no longer in the schema; unset it on every trip
const stale = await client.fetch('*[_type=="trip" && defined(featureOrder)]{ _id }')
for (const d of stale) {
  await client.patch(d._id).unset(['featureOrder']).commit()
  console.log(`✓ ${d._id} — unset stale featureOrder`)
}

console.log('\nDone.')
