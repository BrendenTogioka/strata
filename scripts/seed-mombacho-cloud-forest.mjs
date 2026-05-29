/**
 * Seed the Mombacho Volcano cloud-forest trip post: uploads the photo set +
 * creates the trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-mombacho-cloud-forest.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 *
 * Safe to re-run — createOrReplace() with a deterministic _id. Re-running
 * re-uploads the images (Sanity dedupes identical assets by hash). Images are
 * uploaded as-is; Sanity applies EXIF orientation, so don't pre-rotate.
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
const SRC = '/Users/admin/Desktop/Locations/Mombacho Volcano Natural Reserve'

const PHOTOS = {
  hero:   'DSCF5208.JPG',  // trail leading into a forest of epiphyte-laden trees
  sign:   'DSCF5089.JPG',  // mossy carved trail sign over a dark root-laced path
  flow1:  'DSCF5053.JPG',  // pink + yellow flowers in the base-station garden
  flow2:  'DSCF5066.JPG',  // golden shrimp plant, yellow bracts + white flowers
  hiker:  'DSCF5116.JPG',  // a hiker dwarfed by moss-draped trees on the trail
  roots:  'DSCF5084.JPG',  // gnarled tree roots cloaked in thick green moss
  epi1:   'DSCF5148.JPG',  // a branch loaded with bromeliads + ferns vs the canopy
  epi2:   'DSCF5152.JPG',  // air plants + heart-shaped peperomia vines on a limb
  trunk:  'DSCF5150.JPG',  // mossy trunk hung with ferns, vines, a pink-tinged leaf
  brom:   'DSCF5166.JPG',  // bromeliad clump on a branch against bright white sky
  moss:   'DSCF5156.JPG',  // mossy trunk studded with bromeliads + heart leaves
  orchid: 'DSCF5201.JPG',  // a pale orchid on the crater rim, lowlands hazy behind
  last:   'DSCF5179.JPG',  // bromeliads + ferns on a mossy branch vs pale sky
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `m${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n🌋  Seeding Mombacho cloud forest → ${projectId} / ${dataset}\n`)

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
    section('overview', 'Up into the clouds'),
    text(
      'Mombacho rises straight out of the lowlands just south of Granada — a dormant volcano with its head almost permanently in cloud. We had spent the previous days down in the heat of the city, and the plan for this one was simple: get to the top, where a cloud forest grows in the old craters and does things nothing down in the heat can.',
      'Getting up there is half of it. From the biological station at the base you climb into the back of an open eco-truck and grind up a road so steep it feels built as a dare, coffee and banana giving way to forest as you go. The lowland sun drops behind you. By the time the truck levels out near the rim the air has turned cool and wet, and you are inside the cloud the mountain is named for.',
      'We came in March, the dry season, when Granada bakes — but the top of Mombacho keeps its own weather. The forest drips whether or not it rains. Everything is green, and most of that green is growing on something else.',
    ),
    imageBlock(ref.sign, 'A moss-covered wooden trail sign reading “Mirador” and “Túnel” beside a dark, root-laced path climbing into the cloud forest', 'The Sendero El Cráter trailhead — moss creeping over the signs, the path already vanishing into green.'),
    divider(),

    // ── Getting There ──────────────────────────────────────────────────────
    section('custom', 'The ride up', 'Getting There'),
    text(
      'The base station sits in the dry warmth, surrounded by flowering gardens and the lower edge of the coffee that grows on Mombacho’s flanks. You wait for the truck here, and then you hold on. The road climbs fast enough that your ears pop, the temperature falls degree by degree, and the bright lowland light dims to a soft grey as the canopy and then the cloud close over the track.',
    ),
    gallery('grid', [
      [ref.flow1, 'Clusters of bright pink flowers and yellow blooms in a lush garden at the base of Mombacho', 'Flowers in the garden at the base station, before the climb into the cloud.'],
      [ref.flow2, 'A golden shrimp plant with yellow bracts and small white flowers against dark green foliage', 'Golden shrimp plant by the station — the lowland warmth still in the air.'],
    ]),

    // ── Sendero El Cráter ───────────────────────────────────────────────────
    section('custom', 'Into the cloud forest', 'Sendero El Cráter'),
    text(
      'The main loop, the Sendero El Cráter, wraps one of the volcano’s old craters in a little under a mile. Step onto it and the change is immediate: the trail narrows, the light goes green, and every surface — trunk, branch, rock, railing — is alive with something. It is cool enough for a layer, and the whole forest is wet to the touch even though it hasn’t rained.',
    ),
    imageBlock(ref.hiker, 'A hiker standing on a narrow forest trail, dwarfed by trees draped in moss and epiphytes in the Mombacho cloud forest', 'On the crater loop — the trail narrow, the forest closing in overhead.'),
    text(
      'We took it slowly, partly because the footing is muddy and rooted and partly because there is so much to look at within arm’s reach. Roots spill across the path gone furry with moss. The quiet up here is real — just dripping water, the odd bird, and somewhere below, the hiss of the mountain still letting off steam.',
    ),
    imageBlock(ref.roots, 'Gnarled tree roots cloaked in thick green moss spilling across the cloud-forest floor', 'Roots gone furry with moss — nothing stays bare for long up here.'),
    callout('Sendero El Cráter · ~1.5 km loop · cloud, ~100% humidity, dripping moss'),

    // ── Epiphytes ────────────────────────────────────────────────────────────
    section('custom', 'Everything grows on everything', 'Epiphytes'),
    text(
      'The thing that defines a cloud forest is what grows where there is no soil. Bromeliads, orchids, ferns, mosses, and trailing peperomia don’t bother with the ground here — they live straight on the trees, drinking the cloud out of the air. A single branch can carry a whole hanging garden, and the trees themselves nearly disappear under their tenants.',
    ),
    gallery('grid', [
      [ref.epi1, 'A branch loaded with bromeliads, ferns, and moss seen against the cloud-forest canopy', 'One branch carrying a whole garden of bromeliads and ferns.'],
      [ref.epi2, 'Branches covered in air plants and heart-shaped peperomia vines climbing through the cloud forest', 'Air plants and trailing vines working along every limb.'],
    ]),
    text(
      'Whole trunks turn into vertical gardens, layered top to bottom in moss, fern, and vine, fed entirely by the mist that hangs in the canopy.',
    ),
    imageBlock(ref.trunk, 'A moss-covered tree trunk hung with ferns, vines, and a pink-tinged heart-shaped leaf, a vertical garden in the cloud forest', 'A trunk turned vertical garden, fed by the cloud.'),
    gallery('grid', [
      [ref.brom, 'A clump of bromeliads growing on a bare branch silhouetted against a bright white sky', 'Bromeliads rooted to a bare branch — they live on cloud and air, not soil.'],
      [ref.moss, 'A mossy tree trunk studded with small bromeliads and heart-shaped leaves, soft light behind', 'Moss, air plants, and vine all sharing one trunk.'],
    ]),
    quote('“Nothing here grows alone. Every branch is a garden, every trunk a tenement of moss, fern, and flower.”'),

    // ── The Crater ───────────────────────────────────────────────────────────
    section('custom', 'Fumaroles and the rim', 'The Crater'),
    text(
      'For all the green, Mombacho doesn’t let you forget what it is. Along the trail, fumaroles breathe warm, faintly sulfurous air up through the moss — the volcano, dormant but not dead, still venting. The loop passes a string of miradores on the rim, and on the rare moment the cloud tears open you get the reward: Granada, the vast pale sheet of Lake Nicaragua, and Las Isletas — the 365 little islands that Mombacho itself scattered into the lake when one of its flanks collapsed long ago.',
    ),
    imageBlock(ref.orchid, 'A pale lavender orchid blooming on a grassy crater rim with the hazy forested lowlands falling away behind', 'An orchid on the rim — and, when the cloud thinned, the lowlands a long way below.'),

    // ── Final Thoughts ───────────────────────────────────────────────────────
    section('final', 'What the mountain keeps'),
    text(
      'You can do Mombacho in half a day, and we did, but it stays with you longer than the time it takes. It’s the density of it — a forest so full of life that it grows on itself, hung on a mountain that built the islands you can see from its shoulder. The contrast does the rest: an hour earlier we’d been sweating in Granada, and here we were pulling on a layer in the dripping green.',
      'We climbed back down the absurd road in the open truck, the cloud thinning, the heat rising to meet us, and were back in the city for dinner. A short trip up a single volcano — and a reminder that the most interesting things are often hiding in the weather at the top.',
    ),
    imageBlock(ref.last, 'Bromeliads and ferns perched on a mossy branch against a pale, overcast sky', 'One last look up before the truck down — the canopy still busy with life.'),
    hindsight(
      'Bring a rain layer even in the dry season — it’s a cloud forest, and you will get damp whether or not it rains. Go early in the day for any chance at the view from the miradores, before the cloud thickens. Take the eco-truck up rather than walking the access road; it’s steeper than it has any right to be, and the schedule for the ride back down is worth checking before you start. If you can, hire a guide and walk the longer Sendero El Puma — it’s the better shot at seeing the endemic Mombacho salamander and more of the orchids.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-mombacho-cloud-forest',
    id:    { _type: 'slug', current: 'mombacho-cloud-forest' },
    pageTitle:  ['MOMBACHO', 'CLOUD FOREST'],
    storyTitle: 'Mombacho Volcano Cloud Forest, Nicaragua: A Day in the Bromeliads, Fumaroles, and Mist Above Granada',
    description: 'A day in the cloud forest atop Nicaragua’s Mombacho Volcano — dripping moss, bromeliad-laden trees, fumaroles, and orchids above Granada.',
    tripDate:  '2023-03-13',
    location:  'Mombacho Volcano Natural Reserve, Nicaragua',
    coords:    '11°50′N 85°59′W',
    date:      'March 2023',
    distance:  '~1.5 km crater loop',
    elevation: '~4,400 ft (1,344 m) summit',
    duration:  '1 day',
    category:  'forest',
    tags:      ['photography', 'hiking', 'day-hike', 'tropical', 'volcano'],
    accentColor: '#4F7A4E',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A narrow trail leading into a dense Mombacho cloud forest, the trees on either side draped in moss, bromeliads, and ferns' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Getting There', value: 'Eco-truck from the base station',        status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',    value: 'Easy–moderate · Sendero El Cráter',       status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Best Window',   value: 'Dry season, Dec–Apr',                     status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Guide',         value: 'Required on the longer El Puma trail',    status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Elevation',     value: '~4,400 ft — cool & misty up top',         status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Wildlife',      value: 'Endemic Mombacho salamander; orchids',    status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Crowds',        value: 'Quiet, especially midweek',               status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Bring',         value: 'A rain layer — it’s a cloud forest',      status: 'warn' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '70°F / 60°F',   subtext: 'cool on top, hot below' },
      { _type: 'conditionItem', _key: k(), icon: '🌫', label: 'Sky',         value: 'Cloud & mist',  subtext: 'the forest makes its own weather' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Breezy',        subtext: 'gusty at the miradores' },
      { _type: 'conditionItem', _key: k(), icon: '💧', label: 'Humidity',    value: 'Near 100%',     subtext: 'everything drips' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: mombacho-cloud-forest  (/expedition/mombacho-cloud-forest)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
