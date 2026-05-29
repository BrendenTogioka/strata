/**
 * Seed the Lake Tahoe trip post: uploads the photo set + creates the trip
 * document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-lake-tahoe.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 *
 * Safe to re-run — createOrReplace() with a deterministic _id. Images upload
 * as-is; Sanity applies EXIF orientation, so don't pre-rotate.
 */

import { createClient } from '@sanity/client'
import { createReadStream, existsSync, readFileSync } from 'fs'
import { resolve, dirname, basename, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

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

// ── Photo set ──────────────────────────────────────────────────────────────
const SRC = '/Users/admin/Desktop/Locations/tahoe'

const PHOTOS = {
  hero:   'DSCF1603.JPG',  // person leaping between granite boulders, clear shallows
  pines:  'DSCF1360.JPG',  // the lake seen through tall pines from a forested slope
  camp:   'DSCF1402.JPG',  // person + dog on rocks above a cove at golden hour
  clear:  'DSCF1582.JPG',  // crystal-clear turquoise water over granite boulders
  paddle: 'DSCF1181.JPG',  // a paddleboarder on glassy clear water among boulders
  dog:    'DSCF1550.JPG',  // a dog on a cobble beach in warm evening light
  sunset: 'IMG_6808.JPG',  // person + dog silhouette at old boat tracks, sunset
  shore:  'IMG_6811.JPG',  // person silhouette standing in the shallows at sunset
}

// ── Key generator ────────────────────────────────────────────────────────────
let _n = 0
const k = () => `t${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

// ── Block builders ───────────────────────────────────────────────────────────
const para = (...texts) => texts.map(t => ({
  _type: 'block', _key: k(), style: 'normal', markDefs: [],
  children: [{ _type: 'span', _key: k(), marks: [], text: t }],
}))
const section = (eyebrowKind, dayTitle, customEyebrow) => ({
  _type: 'storyBlock', _key: k(), type: 'dayEntry', eyebrowKind, dayTitle,
  ...(customEyebrow ? { customEyebrow } : {}),
})
const text    = (...ps) => ({ _type: 'storyBlock', _key: k(), type: 'text', richText: para(...ps) })
const quote   = (content) => ({ _type: 'storyBlock', _key: k(), type: 'quote', content })
const callout = (content) => ({ _type: 'storyBlock', _key: k(), type: 'callout', content })
const divider = () => ({ _type: 'storyBlock', _key: k(), type: 'divider' })
const hindsight = (...ps) => ({ _type: 'storyBlock', _key: k(), type: 'hindsight', richText: para(...ps) })
const imageBlock = (ref, alt, caption) => ({
  _type: 'storyBlock', _key: k(), type: 'image',
  image: { _type: 'image', asset: ref, alt, ...(caption ? { caption } : {}) },
})
const gallery = (layout, items) => ({
  _type: 'storyBlock', _key: k(), type: 'gallery', layout,
  images: items.map(([ref, alt, caption]) => ({ _type: 'image', _key: k(), asset: ref, alt, ...(caption ? { caption } : {}) })),
})

// ── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🛶  Seeding Lake Tahoe → ${projectId} / ${dataset}\n`)

  const ref = {}
  for (const [role, filename] of Object.entries(PHOTOS)) {
    const filePath = resolve(SRC, filename)
    if (!existsSync(filePath)) { console.error(`❌  Missing image: ${filePath}`); process.exit(1) }
    const ext = extname(filename).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream'
    const asset = await client.assets.upload('image', createReadStream(filePath), { filename: basename(filename), contentType })
    ref[role] = { _type: 'reference', _ref: asset._id }
    console.log(`📷  ${filename}  →  ${asset._id}`)
  }

  const story = [
    // ── Overview ─────────────────────────────────────────────────────────
    section('overview', 'Late summer at the lake'),
    text(
      'We drove up to Lake Tahoe at the tail end of summer, the paddleboard strapped to the roof and the dog in the back seat, and set up camp above Emerald Bay on the lake’s southwest corner. Tahoe sits at over six thousand feet in the Sierra Nevada, a huge alpine lake ringed by granite and pine, and it is famous for one thing the moment you see it: the water, which is so clear it barely looks real.',
      'The plan was loose — a few nights at camp, day trips to a different stretch of shoreline each day, and as much time on and in the water as the cold would allow. Because that’s the catch. Tahoe is gin-clear and, even at the end of August, genuinely freezing.',
      'Coming right at the end of summer turned out to be the sweet spot. The water was as warm as it gets (which isn’t very), the long days were still warm and dry, and the crowds had started to thin as the season wound down.',
    ),
    imageBlock(ref.pines, 'Lake Tahoe seen through a stand of tall pines from a forested slope, blue water and far mountains beyond', 'First look at the lake through the pines — that impossible blue.'),
    divider(),

    // ── Basecamp ─────────────────────────────────────────────────────────────
    section('custom', 'Camp above Emerald Bay', 'Basecamp'),
    text(
      'Emerald Bay is the postcard corner of Tahoe — a deep, sheltered inlet with a tiny island, steep forested walls, and a road that switchbacks down to the water. We camped up on the rim, close enough to wander down to the shore in the evenings and watch the light go off the bay, the dog nosing along the rocks beside us.',
    ),
    imageBlock(ref.camp, 'A person and a dog resting on rocks above a Lake Tahoe cove at golden hour, a winding shoreline road below', 'Evening above the cove near camp, the dog supervising.'),
    callout('Late Aug · camped above Emerald Bay · day trips around the lake'),

    // ── The Water ─────────────────────────────────────────────────────────────
    section('custom', 'Clear and cold', 'The Water'),
    text(
      'The clarity is the thing everyone tells you about, and it’s still a shock in person. In the shallows the water is a pale turquoise and you can count the stones thirty or forty feet down; the big granite boulders that litter the shoreline look like they’re hanging in glass. We paddleboarded out over it on the calm mornings, drifting above our own shadow on the bottom.',
    ),
    gallery('grid', [
      [ref.clear,  'Crystal-clear turquoise water over scattered granite boulders along the Lake Tahoe shore, framed by a boulder and pines', 'The water is so clear the boulders look like they’re floating.'],
      [ref.paddle, 'A person standing on a paddleboard on glassy clear water among granite boulders, mountains across the lake', 'Paddleboarding over water you can see straight to the bottom of.'],
    ]),
    text(
      'Getting in is another matter. Tahoe is fed by snowmelt and never really warms up, so swimming is less a swim than a fast, gasping plunge off a sun-warmed rock and a scramble back out. We did it anyway, every day, because you can’t look at water that clear and not get in.',
    ),
    quote('“You can count the stones forty feet down — and you can’t stay in past your knees for long. Clearest water we’ve ever swum in, and the coldest.”'),

    // ── East Shore ─────────────────────────────────────────────────────────────
    section('custom', 'The dog’s side of the lake', 'East Shore'),
    text(
      'With the dog along, the Nevada side of the lake quickly became home base for beach days. The California state parks around the bay are stricter about dogs; the East Shore — the boulder coves and cobble beaches on the Nevada side — is far more relaxed about them, and just as beautiful. We spent the warm afternoons there, the dog off doing dog things on the rocks while we swam and dried out in the sun.',
    ),
    imageBlock(ref.dog, 'A dog sitting on a cobblestone beach at Lake Tahoe in warm evening light, pines and calm water behind', 'The Nevada side is the dog’s side — cobble beaches, fewer rules, golden light.'),

    // ── Final Thoughts ───────────────────────────────────────────────────────
    section('final', 'Sun off the water'),
    text(
      'The evenings were the payoff. After the wind dropped, the lake would go to glass and the sun would set behind the western peaks, throwing the whole sky gold across the water. We’d walk down with the dog, stand in the shallows until our feet went numb, and watch it.',
      'It was a simple trip — camp, water, dog, repeat — and that was exactly the point. Tahoe doesn’t need much from you. You just have to show up at the edge of the clearest water in the country and be willing to get cold.',
    ),
    gallery('grid', [
      [ref.sunset, 'Silhouette of a person and a dog standing at the end of old wooden boat tracks leading into Lake Tahoe at sunset', 'Sundown at an old boat ramp — the dog and the last of the light.'],
      [ref.shore,  'Silhouette of a person standing ankle-deep in Lake Tahoe at sunset, golden sky and far mountains behind', 'One more cold-footed minute in the shallows before dark.'],
    ]),
    hindsight(
      'Reserve the Emerald Bay campgrounds months ahead — they book out fast for late summer. Come right after Labor Day if you can: the water’s still (barely) swimmable and the crowds drop off. If you’ve got a dog, base your beach days on the Nevada/East Shore, which is much more dog-friendly than the California state parks around the bay. Don’t plan on long swims — Tahoe stays cold all summer, so it’s more gasp-and-grin than soak — and paddle in the morning, before the afternoon wind comes up and chops the lake.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-lake-tahoe',
    id:    { _type: 'slug', current: 'lake-tahoe' },
    pageTitle:  ['LAKE TAHOE'],
    storyTitle: 'Lake Tahoe in Late Summer: Camping Above Emerald Bay, Paddleboarding Clear Cold Water, and the Dog-Friendly East Shore',
    description: 'Late summer at Lake Tahoe — camped above Emerald Bay, paddleboarding glass-clear cold water, and the dog-friendly Nevada shore.',
    tripDate:  '2022-08-29',
    location:  'Lake Tahoe, California / Nevada',
    coords:    '38°57′N 120°06′W',
    date:      'Aug–Sep 2022',
    distance:  '—',
    elevation: '~6,225 ft (lake)',
    duration:  '5 days · 4 nights',
    category:  'mountain',
    tags:      ['camping', 'water', 'swimming', 'photography', 'golden-hour'],
    accentColor: '#2E7DA1',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A person leaping between two large granite boulders in the crystal-clear shallows of Lake Tahoe, mountains and blue sky behind' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Camp',        value: 'Emerald Bay — reserve months ahead',   status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Best Window', value: 'Jun–Sep; quieter after Labor Day',      status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Water Temp',  value: 'Cold — ~60°F even in summer',           status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Clarity',     value: 'Famous — visible 60+ ft down',          status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Dogs',        value: 'Nevada/East Shore far more dog-friendly', status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Paddle',      value: 'Calm mornings; afternoon wind',         status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Crowds',      value: 'Busy in summer — go early',             status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Parking',     value: 'Popular beaches fill by mid-morning',   status: 'warn' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '75°F / 45°F', subtext: 'warm days, cold nights' },
      { _type: 'conditionItem', _key: k(), icon: '🌊', label: 'Water Temp',  value: '~60°F',       subtext: 'clear and freezing' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Clear & blue', subtext: 'late-summer high pressure' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Calm AM',     subtext: 'builds through the afternoon' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: lake-tahoe  (/expedition/lake-tahoe)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
