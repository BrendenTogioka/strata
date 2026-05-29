/**
 * Seed the Albuquerque Balloon Fiesta trip post: uploads the photo set +
 * creates the trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-albuquerque-balloon-fiesta.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 *
 * Safe to re-run — createOrReplace() with a deterministic _id.
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
const SRC = '/Users/admin/Desktop/Locations/albequerque balloon festival'

const PHOTOS = {
  hero:   'PANA0402.JPG',  // single multicolored checker balloon against blue sky
  field:  'PANA0479.JPG',  // row of balloons on the field at dawn, crowd
  infl1:  'PANA0429.JPG',  // palm-tree balloon among dozens inflating, crowd
  infl2:  'PANA0655.JPG',  // close view into envelope fabric + basket
  asc:    'PANA0404.JPG',  // sky filling with balloons, heart-pattern balloon
  asc1:   'PANA0486.JPG',  // big yellow/orange/blue balloon + many smaller
  asc2:   'PANA0543.JPG',  // sky crowded with balloons incl. animal shapes
  cluster:'PANA0525.JPG',  // four balloons low over the crowd + flags
  sloth:  'PANA0456.JPG',  // giant sloth special-shape balloon over the field
  drift1: 'PANA0557.JPG',  // pale balloon painted with balloons, among many
  drift2: 'PANA0563.JPG',  // sky full of drifting balloons, KOA + balloon-print
  last:   'PANA0654.JPG',  // three balloons against a clean blue sky
}

// ── Key generator ────────────────────────────────────────────────────────────
let _n = 0
const k = () => `a${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n🎈  Seeding Albuquerque Balloon Fiesta → ${projectId} / ${dataset}\n`)

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
    section('overview', 'Before the sun'),
    text(
      'The Albuquerque International Balloon Fiesta is the largest gathering of hot-air balloons on Earth, and the only sane way to see it is to be there before sunrise. We came on a single October morning, parked in the dark, and walked onto a vast field already humming — crews unrolling envelopes the size of houses across the grass, the smell of propane, and a cold that reminded you the high desert hadn’t warmed up yet.',
      'You go for one thing above all: the mass ascension, when hundreds of balloons launch in waves as the sun comes up. But the hour of build-up beforehand is half the magic — the field at ground level, all fabric and fire and anticipation, with the public wandering freely among it.',
      'October mornings here are crisp and, on a good day, dead calm. The fiesta lives or dies on that calm; the same quirk of geography that lets balloons drift out over the valley and back — pilots call it the Box — only works when the dawn air is still.',
    ),
    imageBlock(ref.field, 'A long row of inflated hot-air balloons on the field at dawn as crowds gather, one balloon already aloft', 'Dawn on the field — the launch line filling as the first balloons stand up.'),
    divider(),

    // ── On the Field ─────────────────────────────────────────────────────────
    section('custom', 'Standing them up', 'On the Field'),
    text(
      'Inflation is its own show. Cold air goes in first from big gas fans, the envelope filling and sprawling across the grass; then the burners fire and the whole thing lifts and stands upright, basket creaking, in a few startling minutes. It happens all around you at once — there are no ropes keeping the crowd back here, so you walk the rows between balloons close enough to feel the heat of the burners on your face.',
    ),
    gallery('grid', [
      [ref.infl1, 'A large palm-tree-patterned balloon among dozens inflating on the Balloon Fiesta field at sunrise, crowds around the baskets', 'Crews bring the big envelopes upright as the sun clears the Sandias.'],
      [ref.infl2, 'A close view into the colorful fabric panels of a hot-air balloon envelope with a wicker basket in the foreground', 'Up close, an envelope is just acres of patterned ripstop and a wicker basket.'],
    ]),

    // ── The Launch ─────────────────────────────────────────────────────────
    section('custom', 'Mass ascension', 'The Launch'),
    text(
      'And then they go. Once the launch directors wave them off, the balloons start lifting in waves, and the sky fills faster than you can track — first a few, then dozens, then a ceiling of color drifting overhead in every direction. You spin in place trying to take it in. There is a steady chorus of burners, the odd cheer, and otherwise a strange, floating quiet.',
    ),
    imageBlock(ref.asc, 'Dozens of hot-air balloons climbing into a pale blue morning sky, a blue-and-yellow balloon with red hearts among them', 'And then they go — the sky filling balloon by balloon.'),
    gallery('grid', [
      [ref.asc1, 'A large yellow, orange, and blue checkered balloon aloft amid many smaller balloons and special shapes against a blue sky'],
      [ref.asc2, 'A sky crowded with dozens of hot-air balloons of every color, including animal special-shape balloons', 'At the peak of the ascension you lose count — balloons in every direction.'],
    ]),
    imageBlock(ref.cluster, 'Four hot-air balloons hanging low over the field above flags and a gathered crowd at sunrise', 'A cluster lifting off together, just over the heads of the crowd.'),
    callout('Oct 9 · dawn mass ascension · ~45°F, dead-calm “Box” winds'),

    // ── Overhead ─────────────────────────────────────────────────────────────
    section('custom', 'Shapes and drift', 'Overhead'),
    text(
      'Mixed in among the classic teardrops are the special shapes — the crowd favorites, built as animals, characters, and stranger things, lumbering up over the field to laughter and pointed fingers. A three-story sloth hung over us for a while. Once they’re all up, they simply drift, carried wherever the morning’s light wind decides, scattering slowly across the valley.',
    ),
    imageBlock(ref.sloth, 'A giant sloth-shaped special-shape hot-air balloon hanging in the sky above a row of patterned balloons on the ground', 'The special shapes steal the morning — a three-story sloth among them.'),
    gallery('grid', [
      [ref.drift1, 'A pale blue hot-air balloon decorated with painted hot-air balloons drifting among many others in a blue sky'],
      [ref.drift2, 'A sky full of drifting hot-air balloons, a balloon-print balloon and a yellow KOA balloon among them', 'Once they’re up, they drift with the wind, wherever the morning takes them.'],
    ]),
    quote('“You hear it before you see it — the roar of a hundred burners in the dark — and then the whole sky begins to lift.”'),

    // ── Final Thoughts ───────────────────────────────────────────────────────
    section('final', 'After the burners quiet'),
    text(
      'By full daylight the field is half empty, the balloons scattered miles downwind, and the cold has burned off. It’s a short event — a few hours from dark to done — but it’s one of those mornings that resets your sense of scale. You think you know what a hot-air balloon looks like until there are five hundred of them over your head at once.',
      'We left buzzing, ears full of burner-roar, already talking about coming back to actually go up in one. For now it was enough to have stood underneath the whole sky lifting off.',
    ),
    imageBlock(ref.last, 'Three hot-air balloons — a red-and-white checker, a multicolored patchwork, and a yellow-striped one — floating against a clean blue sky', 'The last few against an empty blue sky, the field emptying below.'),
    hindsight(
      'Get there absurdly early — gates open before dawn and the park-and-ride lines are no joke; arriving late means missing the inflation entirely. Dress for genuine cold at sunrise and peel layers as the desert warms. Walk out among the balloons during inflation — at this fiesta the public stands right in the middle of it, which you don’t get anywhere else. And keep your morning flexible: wind can scrub an ascension with little warning, so the calm, clear dawns are the ones worth chasing.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-albuquerque-balloon-fiesta',
    id:    { _type: 'slug', current: 'albuquerque-balloon-fiesta' },
    pageTitle:  ['ALBUQUERQUE', 'BALLOON FIESTA'],
    storyTitle: 'Albuquerque International Balloon Fiesta: A Dawn Mass Ascension Over the High Desert',
    description: 'A dawn at the Albuquerque International Balloon Fiesta — hundreds of balloons inflating and filling the high-desert sky at sunrise.',
    tripDate:  '2023-10-09',
    location:  'Balloon Fiesta Park, Albuquerque, NM',
    coords:    '35°12′N 106°36′W',
    date:      'October 2023',
    distance:  '—',
    elevation: '~5,000 ft (field)',
    duration:  '1 morning',
    category:  'city',
    tags:      ['photography', 'festival', 'golden-hour'],
    accentColor: '#E2702E',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A single multicolored checkered hot-air balloon rising into a clear blue sky with two more balloons below it' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Getting There',  value: 'Park-and-ride; arrive before dawn',     status: ''     },
      { _type: 'intelRow', _key: k(), key: 'When',           value: 'Early October · ~9 days',               status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Mass Ascension', value: 'At dawn · gates ~4:30am',               status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Crowds',         value: 'Enormous — plan for it',                status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Cost',           value: 'Ticketed entry per session',            status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Light',     value: 'Dawn glow into the ascension',          status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Weather',        value: 'Cold dawn; wind can cancel flights',    status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Bring',          value: 'Layers, cash, comfortable shoes',       status: ''     },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '45°F / 70°F',  subtext: 'cold dawn, warm by midday' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Clear',        subtext: 'crisp high-desert morning' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Light at dawn', subtext: 'calm enough to fly' },
      { _type: 'conditionItem', _key: k(), icon: '🎈', label: 'Balloons',    value: '500+',         subtext: 'launching in waves at sunrise' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: albuquerque-balloon-fiesta  (/expedition/albuquerque-balloon-fiesta)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
