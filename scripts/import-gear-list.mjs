/**
 * Import a per-trip gear list (the "Field Kit" section) from a CSV exported by
 * the ultralight backpacking app, and write it onto the trip's `gearList` field.
 *
 * It also SYNCS new pieces into the standalone /gear library: each item is
 * matched against existing `gear` docs by name+brand; misses are created as
 * HIDDEN gear docs (showOnGearPage:false) for you to publish from Studio,
 * matches are left untouched. Pass --no-sync to skip this.
 *
 * Usage:
 *   node scripts/import-gear-list.mjs <trip-slug> <path-to-csv> [--no-sync] [--no-images] [--dry-run]
 *   e.g. node scripts/import-gear-list.mjs santa-cruz-island ~/Downloads/santa-cruz.csv
 *   --dry-run    parse + probe image URLs and report, writing nothing
 *   --no-images  skip uploading/attaching images from the Image URL column
 *   --no-sync    skip the /gear library sync entirely
 *
 * Reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN
 * from .env (same as the seed scripts). Safe to re-run — it replaces the
 * trip's gearList wholesale and re-syncs the library idempotently (no dupes).
 *
 * Expected CSV columns (header names are matched fuzzily, order-independent).
 * This matches the Ultralight app's export directly — no need to reshape it:
 *   Category, Item (or Name), Brand, (Unit) Weight, Quantity, Wear Type, Included, Notes
 *   - Weight may be "15.7 oz", "15.7", or "445 g" — grams are auto-converted.
 *     "Unit Weight" is preferred over "Total Weight" (qty is applied separately).
 *   - Wear Type is a single column with values base / worn / consumable.
 *     (Legacy fallback: separate boolean "Worn" / "Consumable" columns.)
 *   - Included = No/false/0 rows are skipped; blank counts as included.
 *   - Notes (optional) becomes the item's `note`, shown under it in the Field Kit.
 *   - Image URL (optional) is fetched and uploaded to Sanity, then attached to
 *     the item's /gear library doc (new docs, or existing ones that lack an
 *     image). gearItem rows themselves carry no image — only the library cards.
 *   - A leading "Summary / Base weight / …" block (if present) is skipped; the
 *     real header row is detected automatically.
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

// ── Args ───────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2)
const noSync   = args.includes('--no-sync')
const noImages = args.includes('--no-images')
const dryRun   = args.includes('--dry-run') || args.includes('--dry')
const [slug, csvPath] = args.filter(a => !a.startsWith('--'))
if (!slug || !csvPath) {
  console.error('Usage: node scripts/import-gear-list.mjs <trip-slug> <path-to-csv> [--no-sync]')
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

// Some Ultralight exports prepend a "Summary / Base weight / …" block before the
// real table. Find the actual header row (one with a Name/Item AND a Category
// column) and ignore everything above it.
const isHeaderRow = row =>
  row.some(c => /^(name|item|gear|product)$/.test(norm(c))) &&
  row.some(c => norm(c).includes('categ'))
const hIdx = Math.max(0, rows.findIndex(isHeaderRow))

const headers  = rows[hIdx]
const dataRows = rows.slice(hIdx + 1)
const cCat  = findCol(headers, 'categ')
const cItem = findCol(headers, 'item', 'name', 'gear', 'product')
const cBrand= findCol(headers, 'brand', 'make', 'manufact')
const cWt   = findCol(headers, 'unitweight', 'weight', 'oz', 'gram')
const cQty  = findCol(headers, 'qty', 'quant', 'count')
const cWear = findCol(headers, 'wear')          // single "Wear Type" col: base / worn / consumable
const cWorn = findCol(headers, 'worn')          // legacy fallback: separate boolean columns
const cCons = findCol(headers, 'consum', 'consumable')
const cInc  = findCol(headers, 'includ')        // "Included" yes/no — skip rows the user excluded
const cNote = findCol(headers, 'note', 'comment')
const cImg  = findCol(headers, 'imageurl', 'imagelink', 'image', 'photo', 'picture')

if (cItem === -1) { console.error(`❌  Could not find an Item/Name column. Headers: ${headers.join(', ')}`); process.exit(1) }

let rk = 0, skipped = 0
const gearList = dataRows.map(r => {
  const item = (r[cItem] ?? '').trim()
  if (!item) return null
  // Honor an Included column: skip rows explicitly marked not-included (blank counts as included).
  if (cInc !== -1) {
    const inc = (r[cInc] ?? '').trim()
    if (inc && !truthy(inc)) { skipped++; return null }
  }
  // Wear type: prefer a single "Wear Type" column (base/worn/consumable),
  // else fall back to legacy separate Worn / Consumable boolean columns.
  let worn = false, consumable = false
  if (cWear !== -1) {
    const w = norm(r[cWear])
    worn = w === 'worn'
    consumable = w === 'consumable'
  } else {
    worn = cWorn !== -1 ? truthy(r[cWorn]) : false
    consumable = cCons !== -1 ? truthy(r[cCons]) : false
  }
  const qty = cQty !== -1 ? parseInt((r[cQty] ?? '1').replace(/[^0-9]/g, ''), 10) || 1 : 1
  return {
    _type: 'gearItem',
    _key: `g${(rk++).toString().padStart(3, '0')}`,
    category: (cCat !== -1 ? (r[cCat] ?? '').trim() : '') || 'Other',
    item,
    ...(cBrand !== -1 && (r[cBrand] ?? '').trim() ? { brand: r[cBrand].trim() } : {}),
    weightOz: cWt !== -1 ? parseWeightOz(r[cWt]) : 0,
    qty,
    worn,
    consumable,
    ...(cNote !== -1 && (r[cNote] ?? '').trim() ? { note: r[cNote].trim() } : {}),
    // Local-only: the source image URL. Used by the library sync below; stripped
    // before the gearList is written (the gearItem schema has no image field).
    ...(cImg !== -1 && /^https?:\/\//i.test((r[cImg] ?? '').trim()) ? { _imageUrl: r[cImg].trim() } : {}),
  }
}).filter(Boolean)

if (!gearList.length) { console.error('❌  No gear rows parsed'); process.exit(1) }

const doc = await client.fetch('*[_type == "trip" && id.current == $slug][0]{ _id, "title": pageTitle }', { slug })
if (!doc?._id) { console.error(`❌  No trip found with slug "${slug}"`); process.exit(1) }

const totalOz = gearList.reduce((s, g) => s + (g.weightOz ?? 0) * (g.qty ?? 1), 0)
const cleanList = gearList.map(({ _imageUrl, ...g }) => g) // drop local-only field before writing
const tripTitle = (doc.title ?? []).join(' ') || slug

if (dryRun) {
  console.log(`🔍  DRY RUN — no writes.`)
  console.log(`    Header row detected at line ${hIdx + 1}; ${gearList.length} item(s) parsed (${totalOz.toFixed(1)} oz total)${skipped ? `, ${skipped} skipped (not included)` : ''}.`)
  console.log(`    Would replace gearList on "${tripTitle}".`)
} else {
  await client.patch(doc._id).set({ gearList: cleanList }).commit()
  console.log(`✅  Imported ${gearList.length} gear items (${totalOz.toFixed(1)} oz total) into "${tripTitle}".`)
}

// ── Sync new pieces into the /gear library ─────────────────────────────────
// Each unique item is matched against existing `gear` docs by name+brand.
// A match is left untouched; a miss is created as a HIDDEN gear doc
// (showOnGearPage:false) for the user to publish from Studio. Opt out with --no-sync.
if (!noSync) {
  // Ultralight category → /gear schema category value.
  const CAT_MAP = {
    pack:'pack', backpack:'pack', packcarry:'pack', carry:'pack',
    shelter:'shelter', tent:'shelter', tarp:'shelter', bivy:'shelter', sheltersleep:'shelter', stakes:'shelter',
    sleep:'sleep', sleeping:'sleep', quilt:'sleep', sleepingbag:'sleep', pad:'sleep', pillow:'sleep',
    kitchen:'kitchen', cook:'kitchen', stove:'kitchen', cookpot:'kitchen', utensils:'kitchen', fuel:'kitchen',
    water:'nutrition', hydration:'nutrition', reservoir:'nutrition', food:'nutrition', snacks:'nutrition', nutrition:'nutrition', foodwater:'nutrition',
    clothing:'clothing', clothes:'clothing', footwear:'clothing', apparel:'clothing', clothingfootwear:'clothing', pants:'clothing', gloves:'clothing', hat:'clothing',
    navigation:'navigation', nav:'navigation',
    electronics:'electronics', electronic:'electronics', battery:'electronics', batterycharger:'electronics', charger:'electronics', phone:'electronics', headlamp:'electronics',
    safety:'safety', firstaid:'safety', medical:'safety', safetyfirstaid:'safety',
    camera:'camera', lens:'lens', tripod:'tripod', filter:'filter', audio:'audio',
    accessory:'accessories', accessories:'accessories',
    misc:'misc', other:'misc', hygiene:'misc', sunscreen:'misc', sunglasses:'misc',
  }
  const mapCat = s => CAT_MAP[norm(s)] ?? 'misc'
  // Identity keys for fuzzy name+brand matching across both naming conventions.
  const keysFor = (name, brand) => {
    const ks = new Set(); const n = norm(name); const b = norm(brand)
    ks.add(n)
    if (b && n.startsWith(b)) ks.add(n.slice(b.length)) // name with brand prefix removed
    if (b) ks.add(b + n)                                // brand-prefixed form
    return ks
  }

  // Existing docs, with their _id and whether they already carry an image, keyed
  // by every identity variant so we can both de-dupe and backfill images.
  const existing = await client.fetch('*[_type == "gear"]{ _id, name, brand, "hasImage": defined(image.asset) }')
  const byKey = new Map()
  for (const g of existing) for (const k of keysFor(g.name ?? '', g.brand ?? '')) byKey.set(k, g)

  // Fetch an image URL and upload it to Sanity as an asset reference.
  async function uploadImage(url, label) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const ext = (url.split('?')[0].split('.').pop() || 'jpg').toLowerCase().slice(0, 4)
    const asset = await client.assets.upload('image', buf, { filename: `${label}.${ext}` })
    return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
  }

  let created = 0, matched = 0
  let imgAdded = 0, imgSkipped = 0, imgFailed = 0
  const probed = new Set() // de-dupe URL reachability probes in dry run

  for (const it of gearList) {
    const name = it.brand ? `${it.brand} ${it.item}` : it.item
    const ik   = keysFor(name, it.brand ?? '')
    const hit  = [...ik].map(k => byKey.get(k)).find(Boolean)
    const url  = it._imageUrl

    // In dry run, just probe each unique URL once and report intent.
    if (dryRun) {
      if (hit) matched++; else created++
      if (url && !noImages) {
        if (hit?.hasImage) { imgSkipped++ }
        else if (!probed.has(url)) {
          probed.add(url)
          try {
            const r = await fetch(url, { method: 'HEAD' })
            if (r.ok) imgAdded++; else { imgFailed++; console.log(`   ⚠️  ${name}: image HTTP ${r.status}`) }
          } catch (e) { imgFailed++; console.log(`   ⚠️  ${name}: image fetch failed — ${e.message}`) }
        }
      }
      continue
    }

    let doc = hit
    if (!doc) {
      doc = await client.create({
        _type: 'gear',
        name,
        ...(it.brand ? { brand: it.brand } : {}),
        category: mapCat(it.category),
        weightOz: it.weightOz ?? 0,
        showOnGearPage: false,
        featured: false,
        ...(it.note ? { description: it.note } : {}),
      })
      const rec = { _id: doc._id, name, brand: it.brand ?? '', hasImage: false }
      for (const k of ik) byKey.set(k, rec)
      doc = rec
      created++
    } else {
      matched++
    }

    // Attach the image to any doc that lacks one (new, or a prior hidden import).
    if (url && !noImages && !doc.hasImage) {
      try {
        const image = await uploadImage(url, norm(name) || 'gear')
        await client.patch(doc._id).set({ image }).commit()
        doc.hasImage = true
        imgAdded++
      } catch (e) {
        imgFailed++
        console.log(`   ⚠️  ${name}: image upload failed — ${e.message}`)
      }
    } else if (url && doc.hasImage) {
      imgSkipped++
    }
  }

  const verb = dryRun ? 'would add' : 'added'
  console.log(`   Gear library: ${created} new item(s) ${verb} — HIDDEN until you flip "Show on Gear page" in Studio; ${matched} already present.`)
  if (!noImages) {
    console.log(`   Images: ${imgAdded} ${verb}, ${imgSkipped} skipped (doc already has one), ${imgFailed} failed.`)
  }
}

console.log(`   Restart the dev server (or rebuild) to see the Field Kit section.`)
