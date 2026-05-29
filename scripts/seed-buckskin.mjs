/**
 * Refresh the Buckskin Gulch trip post's photography:
 *   - uploads a curated set of new photos from the Oct 2025 shoot
 *   - rebuilds the story image/gallery blocks (the old post reused two
 *     images across blocks 19/23/27 — block 27 was the same two photos 4×)
 *   - gives Days 3–4 (Paria / Lee's Ferry) real imagery for the first time
 *   - splits the long Day 2/3/4 text blocks so photos interleave the prose
 *
 * The written narrative is preserved exactly — we fetch the live doc and reuse
 * its text/quote/callout/hindsight/video/section blocks verbatim, only slicing
 * paragraph arrays where we break a block in two.
 *
 * Usage: node scripts/seed-buckskin.mjs
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
const SRC = '/Users/admin/Desktop/Locations/buckskin'
const PHOTOS = {
  // Day 1 — Entering Wire Pass (narrow dry slot, light beams)
  d1_beam:    '3-DSCF9158.jpg',
  d1_curve:   '16-DSCF9090.jpg',
  d1_person:  'DSCF8525.jpg',
  d1_walls:   '13-DSCF9165.jpg',
  d1_boulders:'25-DSCF8606.jpg',
  // Day 2 — Mud, Water, and Endless Canyon Walls (deep, muddy, reflective)
  d2_walk:    '23-DSCF8673.jpg',
  d2_dog:     '24-DSCF8634.jpg',
  d2_reflect: '26-DSCF8574.jpg',
  d2_water:   '22-DSCF8692.jpg',
  d2_wide:    '15-DSCF9102.jpg',
  d2_camp:    '5-DSCF9732.jpg',
  // Day 3 — Into Paria Canyon (opens up, river, big walls, fall color)
  d3_wall:    '8-DSCF9548.jpg',
  d3_amphi:   '2-DSCF9519.jpg',
  d3_river:   '7-DSCF9622.jpg',
  d3_tree:    '2-DSCF9894.jpg',
  d3_pair:    'DSCF9809.jpg',
  // Day 4 — Final Miles to Lee's Ferry (widening canyon, crossings, vistas)
  d4_wade:    '1-DSCF9825.jpg',
  d4_ledge:   '4-DSCF9804.jpg',
  d4_vista:   '1-DSCF9901.jpg',
  d4_gravel:  'DSCF9483.jpg',
  d4_wash:    '28-DSCF8504.jpg',
}

// ── Captions / alt text ────────────────────────────────────────────────────
const META = {
  d1_beam:    ['A shaft of daylight falling into a narrow red sandstone corridor in Wire Pass', 'Wire Pass narrows fast — daylight drops in from a slot barely shoulder-wide.'],
  d1_curve:   ['Curving purple and tan sandstone walls above a shallow pool deep in the slot'],
  d1_person:  ['A backpacker standing in a sunbeam where the slot canyon pinches to shoulder width', 'Where the walls close in, the only light comes straight down.'],
  d1_walls:   ['Layered red and cream sandstone folds lit by reflected light inside the canyon'],
  d1_boulders:['A jumble of boulders on the canyon floor below a glowing slot opening'],
  d2_walk:    ['A hiker and dog walking deeper into Buckskin Gulch past a sunlit pool', 'Deeper in, the canyon only gets narrower and darker.'],
  d2_dog:     ['A dog standing alone in a glowing sandstone slot above a muddy pool'],
  d2_reflect: ['A glowing canyon wall reflected in a still, muddy pool between dark boulders', 'Still water, still air — the canyon doubles itself in the mud.'],
  d2_water:   ['Ripples spreading across the surface of golden, silt-heavy water'],
  d2_wide:    ['A tiny figure dwarfed by a vast curving slot-canyon chamber', 'Scale is hard to hold onto down here.'],
  d2_camp:    ['A dog curled up in a quilted jacket on a sleeping pad at camp', 'Everything ended the day caked in mud — the dog included.'],
  d3_wall:    ['A hiker and dog small beneath a massive sunlit red canyon wall along the river', 'Buckskin opens into Paria, and the walls pull back and up.'],
  d3_amphi:   ['A woman and dog walking past a towering orange sandstone amphitheater wall'],
  d3_river:   ['A glowing canyon wall mirrored in the calm brown water of the Paria River'],
  d3_tree:    ['A cottonwood turning bright yellow against red canyon walls in fall'],
  d3_pair:    ['A backpacker and dog resting on a rock ledge beside the river', 'We found a quiet bend and let the afternoon run long.'],
  d4_wade:    ['A backpacker wading a river crossing below tall red sandstone domes', 'The crossings came more often as the canyon widened.'],
  d4_ledge:   ['A hiker and dog on a sandstone ledge above the river beneath a red dome and cottonwoods'],
  d4_vista:   ['Evening light on distant peaks above the river in the widening canyon', 'The last evening — the walls finally give way to open sky.'],
  d4_gravel:  ['Two hikers and a dog crossing a wide gravel bar where the canyon opens to the river'],
  d4_wash:    ['A woman and dog walking out along a sandy wash between red walls and desert brush', 'The final miles to Lee’s Ferry — wider ground, tired legs.'],
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
  console.log(`\n🏜  Refreshing Buckskin Gulch photos → ${projectId} / ${dataset}\n`)

  const doc = await client.fetch(`*[_type=="trip" && id.current=="buckskin-gulch"][0]`)
  if (!doc) { console.error('❌  buckskin-gulch trip not found'); process.exit(1) }
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
    S[0], S[1], S[2], S[3], S[4], S[5],          // video, overview, intro, callout, itinerary, divider

    // ── Day 1 · Entering Wire Pass ──
    S[6], S[7],
    gallery('grid', ['d1_beam', 'd1_curve']),
    S[9],
    img('d1_person'),
    S[11],
    gallery('grid', ['d1_walls', 'd1_boulders']),
    S[13], S[14],

    // ── Day 2 · Mud, Water, and Endless Canyon Walls ──
    S[15],
    slice(S[16], 0, 3),
    img('d2_walk'),
    slice(S[16], 3),
    S[17],                                        // hindsight
    gallery('strip', ['d2_dog', 'd2_reflect', 'd2_water']),
    slice(S[18], 0, 2),
    img('d2_wide'),
    slice(S[18], 2),
    img('d2_camp'),
    S[20],

    // ── Day 3 · Into Paria Canyon ──
    S[21],
    slice(S[22], 0, 3),
    img('d3_wall'),
    slice(S[22], 3, 5),
    gallery('strip', ['d3_amphi', 'd3_river', 'd3_tree']),
    slice(S[22], 5),
    img('d3_pair'),
    S[24],

    // ── Day 4 · Final Miles to Lee's Ferry ──
    S[25],
    slice(S[26], 0, 3),
    img('d4_wade'),
    slice(S[26], 3, 6),
    gallery('strip', ['d4_ledge', 'd4_vista', 'd4_gravel']),
    slice(S[26], 6),
    img('d4_wash'),
    S[28],

    // ── Final Thoughts ──
    S[29], S[30],
  ]

  const newDoc = { ...doc, story }
  delete newDoc._rev
  delete newDoc._createdAt
  delete newDoc._updatedAt

  await client.createOrReplace(newDoc)
  console.log(`\n✅  Updated buckskin-gulch — ${story.length} blocks, ${Object.keys(PHOTOS).length} new photos\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
