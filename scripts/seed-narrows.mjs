/**
 * Add photography to the Narrows (the-narrows) trip post.
 *   - the live post has NO inline images — only a hero + video
 *   - uploads a curated set of 12 photos from the Nov 2025 top-down trip
 *     (DSCF0519 is dropped as a near-duplicate of 3-DSCF0517)
 *   - interleaves image + gallery blocks through the Day 1 / Day 2 prose
 *
 * The written narrative is preserved exactly — we fetch the live doc and reuse
 * its text/quote/callout/hindsight/video/section blocks verbatim, only slicing
 * paragraph arrays where we break a long text block in two.
 *
 * Usage: node scripts/seed-narrows.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 */

import { createClient } from '@sanity/client'
import { createReadStream, existsSync, readFileSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Env ──────────────────────────────────────────────────────────────────
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const [key, val] = line.split('=')
    if (key?.trim() === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = val?.trim()
    if (key?.trim() === 'PUBLIC_SANITY_DATASET'    && !process.env.PUBLIC_SANITY_DATASET) dataset = val?.trim() ?? dataset
    if (key?.trim() === 'SANITY_WRITE_TOKEN'       && !token) token = val?.trim()
  }
} catch {}
if (!projectId) { console.error('❌  Missing PUBLIC_SANITY_PROJECT_ID'); process.exit(1) }
if (!token)     { console.error('❌  Missing SANITY_WRITE_TOKEN'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

// ── Curated photo set (role → filename) ──────────────────────────────────
const SRC = '/Users/admin/Desktop/Locations/narrows'
const PHOTOS = {
  ov:          '7-DSCF0402.jpg',  // iconic tall walls + wader (portrait)
  d1_open:     '5-DSCF0439.jpg',  // wide cobbled river + fall trees (landscape)
  d1_waterfall:'12-DSCF0161.jpg', // long-exposure waterfall (portrait)
  d1_fall:     '10-DSCF0252.jpg', // golden trees + turquoise pool (portrait)
  d1_dark:     '11-DSCF0236.jpg', // dim narrowing walls (landscape)
  d1_camp:     '9-DSCF0270.jpg',  // blue tent campsite on sandbar (landscape)
  d2_morning:  '8-DSCF0372.jpg',  // small waterfalls over mossy rock (portrait)
  d2_drama:    '6-DSCF0403.jpg',  // sunburst flooding canyon + figure (portrait)
  d2_tall:     '4-DSCF0451.jpg',  // tiny figure under immense dark walls (landscape)
  d2_wader:    '2-DSCF0528.jpg',  // red-pack wader, light column (portrait)
  d2_glow:     '1-DSCF0543.jpg',  // glowing reflected wall + green river (portrait)
  d2_cross:    '3-DSCF0517.jpg',  // two hikers wading (landscape)
}

// ── Captions / alt text ────────────────────────────────────────────────────
const META = {
  ov:          ['A hiker wading the Virgin River between towering canyon walls in the Narrows', 'The top-down route follows the Virgin River from Chamberlain Ranch into Zion.'],
  d1_open:     ['A wide stretch of cobbled riverbed lined with golden fall trees in the upper canyon', 'The upper canyon starts open — wide riverbed, fall color, gentle walls.'],
  d1_waterfall:['A small waterfall pouring over a mossy ledge into the river, long exposure'],
  d1_fall:     ['Golden cottonwoods reflected in a turquoise pool along the Virgin River'],
  d1_dark:     ['The canyon walls closing in and darkening as the route narrows'],
  d1_camp:     ['A backpacking tent pitched on a sandbar beside the river at a Narrows campsite', 'By evening we reached camp deep in the canyon — tent on the sand, river a few feet away.'],
  d2_morning:  ['Small waterfalls running over a mossy rock face in soft morning light', 'Morning light reached the upper walls while the river kept moving past camp.'],
  d2_drama:    ['Sunlight flooding down between sheer canyon walls onto a hiker in the river', 'The second day brought the most dramatic light of the trip.'],
  d2_tall:     ['A tiny figure dwarfed by immense dark sandstone walls deep in Zion Canyon'],
  d2_wader:    ['A hiker with a red pack wading through a column of light in the narrowest section'],
  d2_glow:     ['Reflected light glowing on a curving canyon wall above the calm green river', 'Every bend turned up new reflected light and color.'],
  d2_cross:    ['Two hikers wading across the Virgin River below towering canyon walls', 'Cold water, smooth rocks, towering walls, repeat.'],
}

// ── Key generator + block builders ──────────────────────────────────────────
let _n = 0
const k = () => `k${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

let ref = {}
const img = (role) => {
  const [alt, caption] = META[role]
  return { _type: 'storyBlock', _key: k(), type: 'image',
    image: { _type: 'image', asset: ref[role], alt, ...(caption ? { caption } : {}) } }
}
const gallery = (layout, roles) => ({
  _type: 'storyBlock', _key: k(), type: 'gallery', layout,
  images: roles.map(role => {
    const [alt, caption] = META[role]
    return { _type: 'image', _key: k(), asset: ref[role], alt, ...(caption ? { caption } : {}) }
  }),
})
// Re-emit an existing text block but with only a slice of its paragraphs,
// so the original prose is preserved exactly while the block is broken in two.
const slice = (block, start, end) => ({
  _type: 'storyBlock', _key: k(), type: 'text',
  richText: block.richText.slice(start, end),
})

// ── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🏞  Adding Narrows photos → ${projectId} / ${dataset}\n`)

  const doc = await client.fetch(`*[_type=="trip" && id.current=="the-narrows"][0]`)
  if (!doc) { console.error('❌  the-narrows trip not found'); process.exit(1) }
  const S = doc.story
  console.log(`📖  Fetched live doc ${doc._id} — ${S.length} story blocks\n`)

  // Upload curated photos
  for (const [role, filename] of Object.entries(PHOTOS)) {
    const filePath = resolve(SRC, filename)
    if (!existsSync(filePath)) { console.error(`❌  Missing image: ${filePath}`); process.exit(1) }
    const ext = extname(filename).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'application/octet-stream'
    const asset = await client.assets.upload('image', createReadStream(filePath), { filename: basename(filename), contentType })
    ref[role] = { _type: 'reference', _ref: asset._id }
    console.log(`📷  ${filename.padEnd(16)} →  ${asset._id}`)
  }

  const story = [
    S[0], S[1], S[2],                             // video, overview, intro text
    img('ov'),
    S[3], S[4], S[5],                             // hindsight, divider, Day 1 section

    // ── Day 1 · Chamberlain Ranch Into The Narrows ──
    slice(S[6], 0, 3), img('d1_open'),
    slice(S[6], 3, 7), gallery('strip', ['d1_waterfall', 'd1_fall', 'd1_dark']),
    slice(S[6], 7), img('d1_camp'),

    S[7], S[8], S[9],                             // quote, divider, Day 2 section

    // ── Day 2 · Deep Inside Zion Canyon ──
    slice(S[10], 0, 2), img('d2_morning'),
    slice(S[10], 2, 5), img('d2_drama'),
    slice(S[10], 5), gallery('strip', ['d2_tall', 'd2_wader', 'd2_glow']),

    S[11],                                        // callout

    slice(S[12], 0, 3), img('d2_cross'),
    slice(S[12], 3),

    S[13], S[14], S[15],                          // divider, final section, final text
  ]

  const newDoc = { ...doc, story }
  delete newDoc._rev
  delete newDoc._createdAt
  delete newDoc._updatedAt

  await client.createOrReplace(newDoc)
  console.log(`\n✅  Updated the-narrows — ${story.length} blocks, ${Object.keys(PHOTOS).length} new photos\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
