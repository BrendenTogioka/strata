/**
 * Seed the Granada, Nicaragua trip post: uploads the photo set + creates the
 * trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-granada-nicaragua.mjs
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
const SRC = '/Users/admin/Desktop/Locations/granada nicaragua'

const PHOTOS = {
  hero:    'DSCF4857.JPG',  // bell-tower view over rooftops to the cathedral + lake
  coches:  'DSCF4807.JPG',  // horse carriages along a yellow colonial arcade
  cart:    'DSCF4789.JPG',  // vendor pushing a red/yellow cart past a JOYERÍA
  chair:   'DSCF4801.JPG',  // a cyclist carrying a wooden chair on their back
  jaguar:  'DSCF4829.JPG',  // red drink cart painted with a folk-art jaguar
  carry:   'DSCF4785.JPG',  // masked vendor carrying a tray on their head, market
  market:  'DSCF4784.JPG',  // crowded municipal market interior, toys + plastics
  candy:   'DSCF4913.JPG',  // vendor with a huge bundle of pastel cotton candy
  steps:   'DSCF4787.JPG',  // two men on the worn steps of a distressed facade
  water:   'DSCF4783.JPG',  // person carrying a blue water jug, tiled rooftops
  sunset:  'DSCF4872.JPG',  // a colonial church silhouetted against a flaring sunset
}

// ── Key generator ────────────────────────────────────────────────────────────
let _n = 0
const k = () => `g${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n🏛️   Seeding Granada, Nicaragua → ${projectId} / ${dataset}\n`)

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
    section('overview', 'A painted colonial city'),
    text(
      'Granada sits on the northwest shore of Lake Nicaragua, in the flat tropical heat below the Mombacho volcano. Founded in 1524, it’s one of the oldest European-built cities in the mainland Americas, and it still looks the part — block after block of low colonial buildings painted in faded ochre, blue, and rose, with the great yellow cathedral anchoring the center and horse-drawn carriages clopping past the doors.',
      'We came for a couple of days in early March, in the dry-season heat, with no agenda beyond walking the place and watching it work. Granada isn’t a museum town; it’s a busy, slightly worn, completely alive city where the colonial grid is also a market, a thoroughfare, and a front porch for everyone who lives on it.',
      'So that’s what this is — a walk through the streets of an old city on a hot day: the carts and the carriages, the market, the peeling paint, and the light coming off the lake at the end of it.',
    ),
    imageBlock(ref.coches, 'A line of horse-drawn carriages waiting in front of a long yellow colonial arcade with white columns in Granada', 'Carriages along the colonnade — Granada still moves, in part, at the pace of the coche.'),
    divider(),

    // ── Street Life ────────────────────────────────────────────────────────
    section('custom', 'Carts, bikes, and the daily haul', 'Street Life'),
    text(
      'The first thing you notice on foot is how much of the city’s commerce rolls by on two wheels and three. Vendors push wooden carts of drinks, snacks, and shaved ice down the middle of the street; men pedal bikes loaded with whatever needs moving. The colonial walls hold the heat and throw it back at you, and everyone finds the shady side.',
    ),
    imageBlock(ref.cart, 'A vendor pushing a red-and-yellow wooden cart past a jewelry shop with iron grillwork and an ochre colonial wall in bright sun', 'A vendor wheels his cart past the JOYERÍA, the old walls throwing back the heat.'),
    gallery('grid', [
      [ref.chair,  'A person cycling down a sunlit street with a wooden chair balanced on their back, colonial buildings behind', 'In Granada you carry it by bike — even the furniture.'],
      [ref.jaguar, 'A red wooden street cart painted with a folk-art jaguar and lined with bottled drinks in a busy market area', 'Hand-painted carts are their own kind of street art — this one guarded by a jaguar.'],
    ]),
    callout('Mar 11 · the streets of Granada · ~92°F, dry-season heat'),

    // ── Mercado ────────────────────────────────────────────────────────────
    section('custom', 'The market', 'Mercado'),
    text(
      'The municipal market is the loud, dense heart of the city — a warren of stalls under tarps and tin selling produce, plastics, toys, hardware, and food, with barely room to pass. Nothing here is staged for visitors. People work, rest, eat, and haul goods through the crush, a lot of it balanced on heads and shoulders because a cart won’t fit.',
    ),
    gallery('grid', [
      [ref.carry,  'A young vendor in a face mask carrying a wooden tray balanced on their head through the market, a red colonial building behind', 'Everything in the market moves on someone’s head or shoulder.'],
      [ref.market, 'The crowded interior of Granada’s municipal market, stalls piled with toys and plastic goods, a vendor resting among them', 'Inside the market — aisles barely wide enough to pass, piled to the roof.'],
    ]),
    imageBlock(ref.candy, 'A street vendor walking near the lakefront carrying a huge bundle of pastel cotton candy', 'Cotton candy by the armful, drifting down toward the lake.'),

    // ── The Architecture ─────────────────────────────────────────────────────
    section('custom', 'Paint and patina', 'The Architecture'),
    text(
      'Up close, the beauty of Granada is in its wear. The grand facades are cracked and sun-bleached, plaster flaking off to show the adobe and brick underneath, every surface layered in old color. It’s a city that’s been burned and rebuilt more than once — sacked by pirates, torched in the 1850s — and it carries the centuries lightly, used rather than restored.',
    ),
    imageBlock(ref.steps, 'Two men sitting on the worn steps of a colonial building with peeling, distressed plaster, one playing a game on a stool', 'Two men pass the afternoon on the steps, the old plaster peeling behind them.'),
    text(
      'And it’s lived in at street level — doorways open straight onto the sidewalk, neighbors out front, deliveries made on foot under the tiled roofs. We climbed the bell tower at La Merced for the wide view over it all: rooftops running to the yellow cathedral, and the lake and Mombacho hazy beyond.',
    ),
    imageBlock(ref.water, 'A person carrying a large blue water jug on their shoulder down a street of terracotta-tiled rooftops, a church tower in the distance', 'Water delivery the old way, under the tiled roofs.'),
    quote('“It’s a city the color of faded paint and warm stone — every wall peeling, every street still working for its living.”'),

    // ── Final Thoughts ───────────────────────────────────────────────────────
    section('final', 'Light on the old city'),
    text(
      'By late afternoon the heat finally eases, and Granada turns gold — the low sun lighting the church towers and the dust in the air, the streets filling again now that it’s bearable to be out. We watched the sun drop behind one of the old churches and called it.',
      'It’s an easy place to like: small enough to walk in a day, old enough to feel the weight of, and busy enough that you never feel like a spectator. We used it as a base for the volcano and the lake, but the city itself — hot, faded, and fully alive — was the part that stuck.',
    ),
    imageBlock(ref.sunset, 'The silhouette of a colonial church and its domes against a brilliant sunset with sun flare', 'Sundown behind one of the old churches — the heat finally letting go.'),
    hindsight(
      'Granada is small and flat, so walk it — and let the heat set the schedule: out early, slow through the midday, back out when it cools. Climb the bell tower at the La Merced church for the best view over the rooftops to the cathedral and the lake, ideally near sunset. And use the city as a base: Mombacho’s cloud forest, the Masaya market and volcano, and the swimmable Laguna de Apoyo are all short trips away.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-granada-nicaragua',
    id:    { _type: 'slug', current: 'granada-nicaragua' },
    pageTitle:  ['GRANADA'],
    storyTitle: 'Granada, Nicaragua: A Day in the Streets of One of the Americas’ Oldest Colonial Cities',
    description: 'A day in Granada, Nicaragua — horse carriages, market vendors, and faded pastel colonial streets in one of the Americas’ oldest cities.',
    tripDate:  '2023-03-11',
    location:  'Granada, Nicaragua',
    coords:    '11°56′N 85°57′W',
    date:      'March 2023',
    distance:  '—',
    elevation: '—',
    duration:  '2 days',
    category:  'city',
    tags:      ['photography', 'architecture', 'history', 'cultural', 'food'],
    accentColor: '#D98A2E',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'The view from a church bell tower over the tiled rooftops of Granada to the yellow Cathedral of Granada, with Lake Nicaragua and a hazy volcano beyond at golden hour' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Getting There',  value: '~45 min from Managua airport',          status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Founded',        value: '1524 — among the Americas’ oldest',     status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Getting Around', value: 'Walkable · carriages + bikes',          status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Best Window',    value: 'Dry season, Dec–Apr',                   status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Heat',           value: 'Hot, humid lowland — pace yourself',    status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Setting',        value: 'On Lake Nicaragua; Las Isletas nearby', status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Day Trips',      value: 'Mombacho, Masaya, Laguna de Apoyo',     status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Safety',         value: 'Felt safe; normal city sense',          status: 'good' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '92°F / 72°F',  subtext: 'hot lowland days' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Dry & bright', subtext: 'dry-season sun' },
      { _type: 'conditionItem', _key: k(), icon: '💧', label: 'Humidity',    value: 'High',         subtext: 'tropical lakeside' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Light',        subtext: 'breeze off Cocibolca' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: granada-nicaragua  (/expedition/granada-nicaragua)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
