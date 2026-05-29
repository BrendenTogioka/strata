/**
 * Import a per-trip gear list (the "Field Kit" section) from a CSV exported by
 * the ultralight backpacking app, and write it onto the trip's `gearList` field.
 *
 * Usage:
 *   node scripts/import-gear-list.mjs <trip-slug> <path-to-csv>
 *   e.g. node scripts/import-gear-list.mjs santa-cruz-island ~/Downloads/santa-cruz.csv
 *
 * Reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN
 * from .env (same as the seed scripts). Safe to re-run — it replaces the
 * trip's gearList wholesale each time.
 *
 * Expected CSV columns (header names are matched fuzzily, order-independent):
 *   Category, Item (or Name), Brand, Weight, Qty, Worn, Consumable
 *   - Weight may be "15.7 oz", "15.7", or "445 g" — grams are auto-converted.
 *   - Worn / Consumable are optional; yes/true/1/x count as true.
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

// ── Args ───────────────────────────────────────────────────────────────────
const [slug, csvPath] = process.argv.slice(2)
if (!slug || !csvPath) {
  console.error('Usage: node scripts/import-gear-list.mjs <trip-slug> <path-to-csv>')
  process.exit(1)
}

// ── Env ──────────────────────────────────────────────────────────────────
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  const env = readFileSync(resolve(root, '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, v] = line.split('=')
    if (k?.trim() === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v?.trim()
    if (k?.trim() === 'PUBLIC_SANITY_DATASET'    && !process.env.PUBLIC_SANITY_DATASET) dataset = v?.trim() ?? dataset
    if (k?.trim() === 'SANITY_WRITE_TOKEN'       && !token) token = v?.trim()
  }
} catch {}

if (!projectId) { console.error('❌  Missing PUBLIC_SANITY_PROJECT_ID'); process.exit(1) }
if (!token)     { console.error('❌  Missing SANITY_WRITE_TOKEN'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

// ── Minimal CSV parser (handles quoted fields + embedded commas/newlines) ──
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  // Strip a leading BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(v => v.trim() !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(v => v.trim() !== '')) rows.push(row) }
  return rows
}

const norm = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Find the column index whose header matches any of the given substrings
function findCol(headers, ...needles) {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i])
    if (needles.some(n => h.includes(n))) return i
  }
  return -1
}

const truthy = v => /^(y|yes|true|1|x|✓)$/i.test((v ?? '').trim())

// Parse a weight cell → ounces. "445 g" → grams converted; else ounces.
function parseWeightOz(v) {
  const s = (v ?? '').trim()
  if (!s) return 0
  const num = parseFloat(s.replace(/,/g, '').replace(/[^0-9.]/g, ''))
  if (isNaN(num)) return 0
  const isGrams = /(^|\d|\s)g(ram)?s?\b/i.test(s) && !/oz/i.test(s)
  return isGrams ? +(num / 28.349523).toFixed(2) : num
}

// ── Run ──────────────────────────────────────────────────────────────────
const text = readFileSync(resolve(csvPath), 'utf8')
const rows = parseCsv(text)
if (rows.length < 2) { console.error('❌  CSV has no data rows'); process.exit(1) }

const headers = rows[0]
const cCat  = findCol(headers, 'categ', 'type')
const cItem = findCol(headers, 'item', 'name', 'gear', 'product')
const cBrand= findCol(headers, 'brand', 'make', 'manufact')
const cWt   = findCol(headers, 'weight', 'oz', 'gram')
const cQty  = findCol(headers, 'qty', 'quant', 'count')
const cWorn = findCol(headers, 'worn')
const cCons = findCol(headers, 'consum', 'consumable')

if (cItem === -1) { console.error(`❌  Could not find an Item/Name column. Headers: ${headers.join(', ')}`); process.exit(1) }

let rk = 0
const gearList = rows.slice(1).map(r => {
  const item = (r[cItem] ?? '').trim()
  if (!item) return null
  const qty = cQty !== -1 ? parseInt((r[cQty] ?? '1').replace(/[^0-9]/g, ''), 10) || 1 : 1
  return {
    _type: 'gearItem',
    _key: `g${(rk++).toString().padStart(3, '0')}`,
    category: (cCat !== -1 ? (r[cCat] ?? '').trim() : '') || 'Other',
    item,
    ...(cBrand !== -1 && (r[cBrand] ?? '').trim() ? { brand: r[cBrand].trim() } : {}),
    weightOz: cWt !== -1 ? parseWeightOz(r[cWt]) : 0,
    qty,
    worn: cWorn !== -1 ? truthy(r[cWorn]) : false,
    consumable: cCons !== -1 ? truthy(r[cCons]) : false,
  }
}).filter(Boolean)

if (!gearList.length) { console.error('❌  No gear rows parsed'); process.exit(1) }

const doc = await client.fetch('*[_type == "trip" && id.current == $slug][0]{ _id, "title": pageTitle }', { slug })
if (!doc?._id) { console.error(`❌  No trip found with slug "${slug}"`); process.exit(1) }

const totalOz = gearList.reduce((s, g) => s + (g.weightOz ?? 0) * (g.qty ?? 1), 0)
await client.patch(doc._id).set({ gearList }).commit()

console.log(`✅  Imported ${gearList.length} gear items (${totalOz.toFixed(1)} oz total) into "${(doc.title ?? []).join(' ') || slug}".`)
console.log(`   Restart the dev server (or rebuild) to see the Field Kit section.`)
