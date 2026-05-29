/**
 * Seed the Bisti Badlands trip post: uploads the photo set + creates the
 * trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-bisti.mjs
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

// ── Photo set ──────────────────────────────────────────────────────────────
const SRC = '/Users/admin/Downloads/Cloudinary_Archive_2026-05-28_20_10_10_Originals'

const PHOTOS = {
  hero: 'main.png',        // wide vista over the hoodoo basin
  ovw:  '6_cbsaux.png',    // white mounds + dark caprock hill, golden light
  d1:   '16_s0ap0n.png',   // slender twisted spire backlit at sunset
  eggs: '19_gz7cl1.png',   // person walking among the cracked-egg concretions
  g1:   '14_mchlke.png',   // two capped hoodoos against blue sky
  g2:   '17_vnjwzc.png',   // slab of caprock balanced on a thin pedestal
  g3:   '18_cboglc.png',   // capped spire on a striped clay slope
  wood: '4_tlqzh2.png',    // petrified wood, red/cream streaks + lichen
  d3:   '15_lnrdm8.png',   // lone capped hoodoo, open plain behind
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `b${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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

// ── Run ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🌵  Seeding Bisti Badlands → ${projectId} / ${dataset}\n`)

  // Upload every photo, keyed by role.
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
    section('overview', 'A trail-less wilderness'),
    text(
      'Bisti/De-Na-Zin sits on the high desert south of Farmington, New Mexico — a stretch of BLM wilderness with no trails, no signs, and no water. What it has instead is erosion: tens of millions of years of it, working soft clay and sandstone into hoodoos, fins, balanced caps, and the petrified remains of an ancient swamp.',
      'We came in October for three days with cameras and enough water to last, and slept in the car at the edge of the dirt lot each night. The draw is simple. You park, you walk out across cracked ground, and the formations start. Nothing is marked. You navigate by memory and a pin dropped on a phone, and the reward for getting a little lost is that you rarely see another person.',
      'Days ran warm and bright; the nights dropped close to freezing and the sky filled with stars. Most of the good light happened in the first and last hour, so we built the days around sunrise and sunset and let the bright middle hours go to wandering.',
    ),
    imageBlock(ref.ovw, 'Pale sandstone mounds glowing in golden light beneath a dark caprock hill at Bisti Badlands', 'First evening: golden light on the white mounds below a caprock ridge.'),
    divider(),

    // ── Day 1 ────────────────────────────────────────────────────────────
    section('day', 'First Light on the Flats'),
    text(
      'The road in is dirt and washboard — fine in dry weather, a bad idea in wet. We reached the small lot in the late afternoon, the only car there, and walked out before we lost the sun. There is no obvious way in, just a wash to follow and a low rise to climb, and then the ground breaks open into pale mounds and the first hoodoos.',
      'The light went gold fast. Caprock that looked grey at noon turned amber, and the long shadows pulled every ridge and crack into relief. We worked a cluster of spires until the color drained out of the sky, then walked back to the car by headlamp and cooked dinner on the tailgate.',
    ),
    imageBlock(ref.d1, 'A slender sandstone spire backlit by the setting sun, ringed by eroded sandstone blocks', 'Last light on a twisted spire near the wash.'),
    text(
      'Sleeping in the car kept setup simple — no tent to stake in the wind, and we could be shooting within minutes of waking. The wind worked the flats most of the night. By the time it dropped, the temperature had fallen near freezing.',
    ),
    quote('“You don’t find the formations so much as stumble onto them — the ground looks flat until it suddenly isn’t.”'),

    // ── Day 2 ────────────────────────────────────────────────────────────
    section('day', 'Into the Hoodoo Fields'),
    text(
      'We spent the full day on foot, moving between the pockets of formations Bisti is known for. The terrain is easy underfoot — flat clay, sand, low rises — but it all looks the same in every direction, which is exactly how people get turned around out here. We kept checking our track.',
    ),
    imageBlock(ref.eggs, 'A person in a sun hat walking among rounded, cracked sandstone egg formations under a clear sky', 'The cracked-egg garden — sandstone concretions weathered round and split open.'),
    text(
      'One basin holds the cracked eggs: rounded sandstone concretions split open and scattered across the sand like a field of giant stone shells. Past it, the hoodoos start in earnest — balanced caps perched on slender necks, fins, and tables of harder rock left standing while everything softer eroded out from under them.',
    ),
    gallery('strip', [
      [ref.g1, 'Two capped hoodoos standing against a blue sky at golden hour', 'Hard capstones shelter the soft clay beneath, leaving these necks behind.'],
      [ref.g2, 'A wide slab of caprock balanced on a thin sandstone pedestal, backlit by the sun'],
      [ref.g3, 'A capped spire rising from a striped clay slope against a clear blue sky'],
    ]),
    text(
      'Bisti was a swamp and a river delta some seventy million years ago, and the wood from it is still here — logs turned to stone, streaked with iron reds and dotted with lichen. We found a long section of petrified trunk and sat with it through the hot part of the day.',
    ),
    imageBlock(ref.wood, 'Close-up of petrified wood streaked with red and cream, dotted with yellow and grey lichen', 'Petrified wood: a seventy-million-year-old log, now stone.'),
    callout('Day 2 · Hoodoo fields + cracked eggs · 70°F, full sun'),

    // ── Day 3 ────────────────────────────────────────────────────────────
    section('day', 'Last Morning'),
    text(
      'We were up before light on the last day to catch the formations from the other side. Sunrise in Bisti is quieter than sunset — colder, the clay almost white before the sun clears the horizon, then warming through tan to amber in a few minutes. We shot until the light went flat, then walked back, packed the car, and drove out the dirt road toward pavement.',
    ),
    imageBlock(ref.d3, 'A single capped hoodoo catching low golden light, with the open plain stretching behind it', 'First sun on a lone hoodoo, the open San Juan Basin behind.'),
    divider(),

    // ── Final Thoughts ───────────────────────────────────────────────────
    section('final', 'What the desert keeps'),
    text(
      'Bisti rewards a particular kind of patience. There is no summit, no marked loop, no payoff waiting at a fixed mileage — just ground that keeps unfolding into stranger shapes the longer you walk it. Three days was enough to learn how the light moves across it and not much more.',
      'What stays with you is the quiet and the scale of time: rock that was a forest, then a seabed, then a desert, eroding a little more with every wind. We left more careful than we arrived — about water, about the road, about keeping track of the way back. Mostly we left wanting the next sunrise.',
    ),
    hindsight(
      'Drop a GPS pin at the car before you walk in and download an offline map — there are no trails or landmarks, and the formations all start to look alike once you’re a mile out. Check the forecast for the access road too; the clay turns to grease when it’s wet.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-bisti-badlands',
    id:    { _type: 'slug', current: 'bisti-badlands' },
    pageTitle:  ['BISTI', 'BADLANDS'],
    storyTitle: 'Bisti/De-Na-Zin Wilderness Trip Report (3 Days): Hoodoos, Cracked Eggs, and Car Camping in New Mexico’s Badlands',
    description: 'Three days roaming a trail-less New Mexico wilderness of hoodoos, balanced caprock, and petrified wood — sleeping in the car between sunsets.',
    tripDate:  '2023-10-08',
    location:  'Bisti/De-Na-Zin Wilderness, NM',
    coords:    '36°16′N 108°05′W',
    date:      'October 2023',
    distance:  '~4–6 mi/day roaming',
    elevation: '—',
    duration:  '3 days · 2 nights',
    category:  'desert',
    tags:      ['photography', 'camping', 'golden-hour', 'remote'],
    accentColor: '#C0894A',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'Wide view over the hoodoo basin of Bisti Badlands under a cloud-streaked sky' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Permit',           value: 'None — free BLM wilderness',     status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',       value: 'Easy terrain, hard navigation',  status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Window',      value: 'Oct–Apr',                        status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Water Source',     value: 'None — pack it all in',          status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Cell Service',     value: 'None at the trailhead',          status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Crowds',           value: 'Sparse — mostly solitude',       status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Navigation',       value: 'No trails or markers — GPS essential', status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Trailhead Access', value: 'Dirt road, dry-weather only',    status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Camping',          value: 'Car camp at the lot; no facilities', status: '' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡',  label: 'Temperature', value: '70°F / 38°F', subtext: 'warm days, cold nights' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Clear',       subtext: 'high-desert blue' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: '10–15 mph',   subtext: 'gusts across the flats' },
      { _type: 'conditionItem', _key: k(), icon: '🌙', label: 'Moon Phase',  value: 'Waning crescent', subtext: 'dark, star-heavy nights' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: bisti-badlands  (/expedition/bisti-badlands)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
