/**
 * Fill in any MISSING image alt text across all trips, using the deterministic
 * no-AI fallback in src/lib/altFallback.mjs (trip + section heading). This is
 * the persisted safety net — run it after seeding or after Studio edits to keep
 * the dataset clean. It never overwrites existing alt, and never touches
 * captions (a generic, non-descriptive caption is worse than none).
 *
 *   node scripts/generate-alt-captions.mjs           # write
 *   node scripts/generate-alt-captions.mjs --dry      # preview only
 *
 * For copy that actually describes the photo, author it by hand (or switch to a
 * vision model later — this script is the floor, not the ceiling).
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deriveAlt } from '../src/lib/altFallback.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry')

let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const [k, v] = line.split('=')
  if (k?.trim() === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v?.trim()
  if (k?.trim() === 'PUBLIC_SANITY_DATASET'    && !process.env.PUBLIC_SANITY_DATASET) dataset = v?.trim() ?? dataset
  if (k?.trim() === 'SANITY_WRITE_TOKEN'       && !token) token = v?.trim()
}
if (!projectId || !token) { console.error('❌  Missing Sanity creds in .env'); process.exit(1) }
const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

const blank = (v) => !String(v ?? '').trim()

async function run() {
  console.log(`\n🅰️   ${DRY ? 'Previewing' : 'Filling'} missing alt text → ${projectId}/${dataset}\n`)
  const docs = await client.fetch(`*[_type=="trip"]{_id,"slug":id.current}`)
  let grand = 0
  for (const { _id, slug } of docs) {
    const trip = await client.getDocument(_id)
    let filled = 0
    if (trip.heroImage && blank(trip.heroImage.alt)) {
      const alt = deriveAlt(trip)
      console.log(`  ${slug}  hero → "${alt}"`)
      trip.heroImage.alt = alt; filled++
    }
    let section = ''
    for (const block of trip.story ?? []) {
      if (block?.type === 'dayEntry') { section = block.dayTitle || block.customEyebrow || ''; continue }
      if (block?.type === 'image' && block.image && blank(block.image.alt)) {
        const alt = deriveAlt(trip, section)
        console.log(`  ${slug}  image → "${alt}"`)
        block.image.alt = alt; filled++
      }
      if (block?.type === 'gallery') {
        for (const img of block.images ?? []) {
          if (img && blank(img.alt)) {
            const alt = deriveAlt(trip, section)
            console.log(`  ${slug}  gallery → "${alt}"`)
            img.alt = alt; filled++
          }
        }
      }
    }
    if (filled && !DRY) await client.patch(_id).set({ heroImage: trip.heroImage, story: trip.story }).commit()
    if (filled) console.log(`  → ${slug}: ${filled} filled${DRY ? ' (dry)' : ''}\n`)
    grand += filled
  }
  console.log(grand === 0 ? '✓  Nothing missing — all images already have alt.' : `\n── ${DRY ? 'Would fill' : 'Filled'} ${grand} alt field(s).`)
}
run().catch(e => { console.error('❌', e.message); process.exit(1) })
