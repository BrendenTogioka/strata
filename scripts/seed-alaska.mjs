/**
 * Update the aurora post into the Fairbanks, Alaska trip report: uploads the
 * selected photo set + replaces the trip-aurora-borealis document live.
 *
 * Usage:
 *   node scripts/seed-alaska.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 *
 * Safe to re-run — createOrReplace() with a deterministic _id. Re-running
 * re-uploads the images (Sanity dedupes identical assets by hash).
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

// ── Photo set (the objectively strongest frames from the shoot) ──────────────
const SRC = '/Users/admin/Desktop/Locations/alaska'

const PHOTOS = {
  hero: '1.jpg',                       // figure under a green+magenta aurora over a snowy valley
  ovw:  'denali.webp',                 // Alaska Range at dusk, pink cloud, frozen flats
  d2:   'astro2.jpg',                  // aurora over spruce with the rental parked below
  d3:   'astro4.jpg',                  // full-sky corona, green/purple/yellow
  d4:   'astro5.webp',                 // green + pink pillars over a frozen lake with huts
  g1:   '4.jpg',                       // horizon-to-horizon green + magenta band
  g2:   'DSCF7599-Enhanced-NR.jpg',    // vivid vertical corona, green/purple rays
  d6:   'DSCF7663-Enhanced-NR.webp',   // figure watching a green band over a snowy valley
  d7:   'DSCF7611-Enhanced-NR.jpg',    // green/purple rays over a spruce skyline
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `a${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

// ── Block builders ───────────────────────────────────────────────────────────
const para = (...texts) => texts.map(t => ({
  _type: 'block', _key: k(), style: 'normal', markDefs: [],
  children: [{ _type: 'span', _key: k(), marks: [], text: t }],
}))

const section = (eyebrowKind, dayTitle) => ({ _type: 'storyBlock', _key: k(), type: 'dayEntry', eyebrowKind, dayTitle })
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

const contentTypeFor = (filename) => {
  const ext = extname(filename).toLowerCase()
  if (ext === '.png')  return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

// ── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🌌  Updating aurora post → Fairbanks, Alaska  (${projectId} / ${dataset})\n`)

  const ref = {}
  for (const [role, filename] of Object.entries(PHOTOS)) {
    const filePath = resolve(SRC, filename)
    if (!existsSync(filePath)) { console.error(`❌  Missing image: ${filePath}`); process.exit(1) }
    const asset = await client.assets.upload('image', createReadStream(filePath), { filename: basename(filename), contentType: contentTypeFor(filename) })
    ref[role] = { _type: 'reference', _ref: asset._id }
    console.log(`📷  ${filename}  →  ${asset._id}`)
  }

  const story = [
    // ── Overview ─────────────────────────────────────────────────────────
    section('overview', 'A week under the oval'),
    text(
      'Fairbanks sits in interior Alaska, more or less under the auroral oval — the band of sky where the northern lights turn up most often. Long winter nights and a dry, settled climate mean clear skies more nights than not, which is the whole reason to come. We went the second week of March 2025 and rented a cabin a short drive outside town to use as a base.',
      'The plan was loose on purpose: watch the forecast, sleep when we could, and drive when the sky looked promising. Days went to slower things — a soak at Chena Hot Springs, an afternoon in an ice-fishing hut, a walk through the ice-sculpture park — and the nights went to the aurora. It showed every night of the trip, from a faint green smear low in the north to curtains that ran the whole sky.',
      'Cold was the constant. Daytime hovered near 20°F; out away from town the overnight lows dropped past −10°F. That cold is also what keeps the air clear, so we layered up and stayed out longer than was strictly comfortable.',
    ),
    imageBlock(ref.ovw, 'The snow-covered Alaska Range catching pink dusk light beneath streaked clouds, frozen flats in the foreground', 'Daytime in interior Alaska: the range at dusk before the night’s work began.'),
    divider(),

    // ── Day 1 ────────────────────────────────────────────────────────────
    section('day', 'Arrival, first glow'),
    text(
      'We landed in Fairbanks in the afternoon, picked up the rental, and drove out to the cabin as the light went flat and blue. Everything was quieter and colder than expected — the kind of cold that closes in the moment you step outside and makes the snow squeak underfoot.',
      'We hadn’t planned to chase the first night. We didn’t have to. Once it was fully dark we stepped out behind the cabin and a faint green band was already forming overhead, soft and slow, easy to mistake for cloud until it brightened. Enough to confirm what we’d come for.',
    ),
    callout('Day 1 · Cabin outside Fairbanks · −8°F'),

    // ── Day 2 ────────────────────────────────────────────────────────────
    section('day', 'First real chase'),
    text(
      'The first full night of chasing set the routine. We drove out of town to get clear of the light, using plowed pull-offs and open stretches of snow as viewing spots. The farther from Fairbanks, the more the sky opened up.',
      'It built slowly — a faint arc low to the north, then movement, then structure. Green bands stretched overhead and pulsed in slow waves, with a wash of red higher up that the camera caught before our eyes did. We stayed out past the point of feeling our feet, moving spot to spot, never quite ready to call it.',
    ),
    imageBlock(ref.d2, 'Green and red aurora over a row of silhouetted spruce, the rental car parked on the snow below', 'Spot to spot by car — the rental doubled as a windbreak between shots.'),
    quote('“It’s hard to leave when you know it could get better at any moment — so we kept not leaving.”'),

    // ── Day 3 ────────────────────────────────────────────────────────────
    section('day', 'Chena Hot Springs'),
    text(
      'The day went to Chena Hot Springs Resort, about an hour and a half northeast of town. Sitting in steaming water with the air well below freezing and the surrounding spruce loaded with snow is a contrast that’s hard to describe and easy to stay in too long. Hair froze stiff; everything below the surface stayed warm.',
      'That night the aurora came back stronger — faster movement, brighter green, a fringe of purple at the edges. We watched from the cabin for a while before driving out to darker ground again. Even having seen it the night before, the pull to go back out was immediate.',
    ),
    imageBlock(ref.d3, 'A full-sky aurora corona with green, purple, and yellow rays radiating overhead among the stars', 'The sky directly overhead, rays fanning out from the corona.'),

    // ── Day 4 ────────────────────────────────────────────────────────────
    section('day', 'Ice on the lake'),
    text(
      'We spent the day in a heated ice-fishing hut on a frozen lake. Stepping onto the ice is unsettling at first in the way only standing on frozen water can be — solid, but your body doesn’t believe it. Inside the hut it was warm and still, a hole drilled through to dark water, and the fishing was slow in a way that turned out to be the point.',
      'The night’s display was quieter — a soft glow overhead that came and went in waves rather than the full performance. Not every night needs to be loud to be worth standing out in.',
    ),
    imageBlock(ref.d4, 'Green and pink aurora pillars reflected over a frozen lake with small ice-fishing huts on the horizon', 'Pink and green over the frozen lake, huts dark on the far shore.'),
    callout('Day 4 · Frozen lake · −14°F overnight'),

    // ── Day 5 ────────────────────────────────────────────────────────────
    section('day', 'Ice park, then the big show'),
    text(
      'During the day we walked the World Ice Art Championships, the ice-sculpture park on the edge of town. Whole scenes carved from blocks of river ice, lit from within, holding detail you wouldn’t think ice could keep. In the cold they read as permanent — frozen architecture rather than something temporary.',
      'That night was the strongest of the trip. The sky came alive not long after dark and kept building. Bands of green ran horizon to horizon, shifting direction without warning, folding into curtains that looked pulled across the sky on a wire. At one point we put the cameras down and just watched.',
    ),
    gallery('grid', [
      [ref.g1, 'A broad green and magenta aurora band stretching horizon to horizon over a dark Alaskan valley', 'Horizon to horizon — the band reached most of the way across the sky.'],
      [ref.g2, 'A vivid vertical aurora corona of green and purple rays filling the frame among dense stars'],
    ]),
    quote('“This was the night we stopped shooting for a while and just stood under it.”'),

    // ── Day 6 ────────────────────────────────────────────────────────────
    section('day', 'Long drive, deep night'),
    text(
      'By now we had the rhythm: check the forecast, watch the sky, drive when it was worth it. We spent the day on quiet roads outside the city, stopping wherever the landscape opened up. Distance is hard to read out here — everything is white and flat and far, and a ridge that looks close is an hour off.',
      'The night gave another strong show. Not quite Day 5, but more restless — the aurora reshaping every few minutes, less a display than a system moving overhead. We found a rise with a clear view down a valley and stayed with it.',
    ),
    imageBlock(ref.d6, 'A lone figure in a heavy coat watching a green aurora band arc over a wide, snow-covered valley', 'A rise above the valley, the band holding overhead for most of an hour.'),

    // ── Day 7 ────────────────────────────────────────────────────────────
    section('day', 'Last night out'),
    text(
      'The final day ran slower. We stayed close to the cabin, not wanting to chase far, holding the last-night mix of hoping for one more show and starting to accept the week was closing.',
      'The sky showed up anyway — soft and steady, not the most intense of the trip but maybe the most settled. We stood out longer than we needed to, no urgency to it. A quiet sendoff.',
    ),
    imageBlock(ref.d7, 'Green and purple aurora rays rising over a low spruce skyline under a field of stars', 'The last night: green and purple over the spruce, slow and steady.'),
    divider(),

    // ── Final Thoughts ───────────────────────────────────────────────────
    section('final', 'What the dark gives back'),
    text(
      'A week in Fairbanks in aurora season is less a checklist than a rhythm — wait, watch, move when the sky says to. Seeing the lights every single night wasn’t something we’d counted on, even with good odds, and it turned the trip into a loop: dark falls, the forecast ticks up, you pull on every layer you own and step out into something you can’t predict.',
      'The daytime — the hot springs, the lake, the ice park — gave the week its shape, but the story was always at night. Some nights it was a faint green smudge you had to talk yourself into. Some nights it ran the whole sky. In Fairbanks you’re in the right place for both, and the only real skill is staying out long enough to find out which one you got.',
    ),
    hindsight(
      'Base yourself outside the city and keep the tank full — the best skies were a 20–40 minute drive from the cabin, and you don’t want to be hunting for an open gas station at 1 a.m. in −15°F. Keep spare camera batteries in an inside pocket too; they die fast in the cold.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-aurora-borealis',
    id:    { _type: 'slug', current: 'fairbanks-aurora' },
    pageTitle:  ['FAIRBANKS', 'AURORA'],
    storyTitle: 'Fairbanks Trip Report (7 Nights): Chasing the Northern Lights, Cold Nights, and Arctic Stillness in Interior Alaska',
    description: 'Seven sub-zero nights chasing the aurora out of Fairbanks — clear skies, hot springs, ice fishing, and green light every single night.',
    tripDate:  '2025-03-10',
    location:  'Fairbanks, Alaska',
    coords:    '64°50′N 147°43′W',
    date:      'March 2025',
    distance:  '~600 mi night driving',
    elevation: '—',
    duration:  '7 nights',
    category:  'arctic',
    tags:      ['photography', 'night-sky', 'winter', 'remote'],
    accentColor: '#44EE88',
    featured:  true,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A lone figure watching a green and magenta aurora over a vast snow-covered Alaskan valley under the stars' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Permit',        value: 'None',                              status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',    value: 'Easy — car-based viewing',          status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Best Window',   value: 'Aug–Apr',                           status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Cell Service',  value: 'Good in town, spotty on backroads', status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Crowds',        value: 'Moderate at known pull-offs',       status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Vehicle',       value: 'AWD/4WD + winter tires',            status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Hazards',       value: 'Sub-zero cold, road ice, wildlife', status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Aurora Activity', value: 'Kp 2–5, visible every clear night', status: 'good' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡',  label: 'Temperature', value: '20°F / −12°F', subtext: 'day high / overnight low' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Mostly clear', subtext: 'critical for aurora' },
      { _type: 'conditionItem', _key: k(), icon: '🌙', label: 'Moon Phase',  value: 'New',          subtext: 'dark skies = stronger aurora' },
      { _type: 'conditionItem', _key: k(), icon: '🌅', label: 'Sun Hours',   value: '~11 hr',       subtext: 'long nights for viewing' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Updated trip: aurora-borealis  (/expedition/aurora-borealis)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
