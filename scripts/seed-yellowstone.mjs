/**
 * Seed the Yellowstone trip post: uploads the photo set + creates the trip
 * document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-yellowstone.mjs
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
const SRC = '/Users/admin/Desktop/Locations/yellowstone np'

const PHOTOS = {
  hero:    '14-PANA7720.jpg',   // Mammoth terraces, sunstar through steam over reflecting pools
  ovw:     '3-PANA5267.jpg',    // deep blue spring set into a wide steaming basin, big sky
  glory:   '7-PANA5526.jpg',    // Morning Glory Pool — yellow/orange ring, green-blue center
  pool:    '16-PANA5270.jpg',   // deep teal spring, scalloped white rim, forested hill
  geyser:  '20-PANA7189-3.jpg', // geyser erupting in a tall fan of spray over the flats
  runoff:  '5-PANA5189.jpg',    // orange/green thermal runoff bleeding into Yellowstone Lake
  lake:    '8-PANA5183-2.jpg',  // Yellowstone Lake gone glass-flat, rocky shore
  falls:   '10-PANA8177.jpg',   // Lower Falls plunging into the Grand Canyon of the Yellowstone
  snags:   '18-PANA7137-3.jpg', // bleached dead "bobby-sock" trees in a thermal flat
  mud:     '2-PANA7158-3.jpg',  // pink/tan mud flats, lone rust-tinged pine, fence
  terrace: '17-PANA7760.jpg',   // Mammoth travertine terraces close up, warm raking light
  rainbow: '19-PANA8348.jpg',   // double rainbow over sunlit pine forest, dark sky
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `y${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n🦬  Seeding Yellowstone → ${projectId} / ${dataset}\n`)

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
    section('overview', 'Four days around a supervolcano'),
    text(
      'Yellowstone is enormous — more than two million acres sitting on top of an active supervolcano, laced together by a single figure-eight road that takes most of a day to drive end to end. We had four days in September, a car set up to sleep in, and a spot in the national forest just outside the west entrance. The plan, to the extent we had one, was to drive a different stretch of the loop each day and take whatever the park put in front of us.',
      'What it put in front of us, mostly, was steam and bison. The ground here doesn’t behave like ground anywhere else — it hisses, bubbles, and bleeds color, with hot springs the blue of pool water and mud that breathes. And between the basins, the herds: bison grazing the meadows by the hundred and crossing the road whenever they felt like it, completely indifferent to the line of cars stacking up behind them.',
      'September turned out to be a good time to come. The summer crowds had thinned, the mornings had an edge to them, and the bison were on the move. We slept in the car each night with the platform built out flat, woke up cold, made coffee in the trees, and drove back through the entrance gate as the light came up.',
    ),
    imageBlock(ref.ovw, 'A deep blue hot spring rimmed with white mineral crust, a broad geyser basin and puffy clouds stretching behind it', 'The first morning — a blue spring set into a basin that steamed in every direction.'),
    divider(),

    // ── Day 1 ────────────────────────────────────────────────────────────
    section('day', 'Geyser country'),
    text(
      'We started where everyone starts: Old Faithful and the Upper Geyser Basin, the densest collection of geysers on Earth. The boardwalks run for miles out across a bone-white plain, past springs with names and springs without, and the whole basin smells faintly of sulfur and throws off heat you can feel on your face when the wind shifts.',
      'You learn to read the colors fast. The deep blues are the hottest and clearest; the oranges, yellows, and greens fanning out from the edges are mats of bacteria living in water that would cook you. Morning Glory Pool was the one we’d come to see — a ringed eye of yellow and green, its cooler edges tinted by decades of coins tossed into the vent.',
    ),
    imageBlock(ref.glory, 'Morning Glory Pool, a hot spring ringed in yellow and orange fading to a deep green-blue at its center', 'Morning Glory Pool — the colors are living bacteria, the cooler rim a century of coins thrown into the vent.'),
    text(
      'We spent the whole morning just walking the basins, waiting out eruptions and watching geysers fire off without warning across the flats. A few you can predict to the hour; most you can’t, and there’s a particular thrill to a column of water and steam going up two hundred yards away while you weren’t looking.',
    ),
    gallery('grid', [
      [ref.pool,   'A deep teal hot spring with a scalloped white rim against a forested hillside and blue sky', 'Another blue pool, scalloped white at the edge — the hotter the water, the clearer the blue.'],
      [ref.geyser, 'A geyser erupting in a tall fan of water and spray above a pale thermal flat', 'A geyser going off across the flats — most fire with no warning at all.'],
    ]),
    callout('Day 1 · Old Faithful + the geyser basins · first bison jam on the drive out'),

    // ── Day 2 ────────────────────────────────────────────────────────────
    section('day', 'The lake and West Thumb'),
    text(
      'Yellowstone Lake is the largest high-elevation lake in North America, big enough to make its own weather, and the drive to its western edge is one of the prettiest in the park. At West Thumb the thermal features run right down to the shoreline — hot springs steaming a few feet from cold lake water, runoff channels streaked orange and green cutting across the sand into the shallows.',
      'It’s a strange place to stand. On one side, a spring hot enough to kill you; on the other, a lake so clear and still it looks like glass. We followed the boardwalk down to where the two met and sat there a while.',
    ),
    imageBlock(ref.runoff, 'A stream of orange and green microbial runoff cutting across pale ground into the clear shallows of Yellowstone Lake', 'West Thumb — thermal runoff bleeding straight into the cold edge of Yellowstone Lake.'),
    text(
      'Most of the day, though, went to driving. The park is so big that getting from one basin to the next eats hours, and we’d badly underestimated it. We ate lunch in turnouts, watched the lake change color with the clouds, and got stopped — twice — behind bison who’d decided the road was theirs.',
    ),
    imageBlock(ref.lake, 'The calm, glassy surface of Yellowstone Lake under a soft sky, with a rocky shoreline in the foreground', 'Yellowstone Lake gone glass-flat in the afternoon — big enough to brew its own storms.'),
    quote('“A bison will not be hurried. You stop, you turn the engine off, and you let the biggest animal for miles cross the road on its own schedule.”'),

    // ── Day 3 ────────────────────────────────────────────────────────────
    section('day', 'The canyon and the paint pots'),
    text(
      'The Grand Canyon of the Yellowstone is the surprise of the park — a thousand-foot gorge of yellow and rust-colored rock with the river thundering through the bottom of it. We walked out to the overlooks above the Lower Falls and stood watching the water drop more than three hundred feet, the spray catching the light the whole way down.',
    ),
    imageBlock(ref.falls, 'The Lower Falls of the Yellowstone River plunging into a deep canyon of pale yellow and tan rock', 'The Lower Falls — a 308-foot drop into the Grand Canyon of the Yellowstone.'),
    text(
      'From the canyon we worked back through the stranger thermal country — mud pots plopping like boiling porridge, milky springs ringed in pink and grey, and whole stands of trees bleached white and dead where the hot water shifted and drowned their roots. These were the parts that felt least like Earth.',
    ),
    gallery('grid', [
      [ref.snags, 'Bleached, dead tree trunks standing upright in a flat of pale thermal ground under a blue sky', 'Bobby-sock trees — pines killed and bleached white where the hot water moved in around their roots.'],
      [ref.mud,   'Pink and tan mineral mud flats with a single rust-tinged pine and a wooden fence under puffy clouds', 'Pink mud flats at the paint pots, a lone pine hanging on at the edge.'],
    ]),

    // ── Day 4 ────────────────────────────────────────────────────────────
    section('day', 'Mammoth Hot Springs'),
    text(
      'We saved Mammoth for the last day — the terraces at the far north of the park, where hot water loaded with limestone builds and abandons travertine steps that look like a frozen waterfall. They’re always changing; a terrace that’s wet and alive one season goes chalk-dry and grey the next as the water finds a new way down.',
      'We got there early, before the heat burned off the steam, and had the boardwalks mostly to ourselves. The low sun came through the rising steam and lit the whole hillside gold.',
    ),
    imageBlock(ref.terrace, 'Steaming travertine terraces at Mammoth Hot Springs, warm light raking across the layered white-and-tan steps', 'Mammoth at first light — travertine steps still building, the steam catching the low sun.'),
    divider(),

    // ── Final Thoughts ───────────────────────────────────────────────────
    section('final', 'What four days gets you'),
    text(
      'Four days in Yellowstone is enough to drive the loop and stand in front of the famous things; it’s nowhere near enough to know the place. We left with a notebook of pullouts we never reached and a clear sense of how much we’d been driving straight past. The park rewards slowing down, and we mostly didn’t have the time to.',
      'What stays with us is the contradiction of it — that something this violent underneath could be this beautiful on top, and that the most powerful thing in the park on any given day is a herd of animals deciding when to cross the road. We slept outside the gate, woke up cold, and drove back in every morning glad to. We’d come back in a heartbeat, and stay longer.',
    ),
    imageBlock(ref.rainbow, 'A double rainbow arcing over a stand of sunlit pine forest under a dark, clearing sky', 'A double rainbow over the trees near camp on the last evening — the park’s parting trick.'),
    hindsight(
      'Give yourself more days than you think, and pick one or two regions a day rather than trying to see all of it — the distances between basins are deceptive and the driving will eat your time. Sleeping outside the gates is cheaper and quieter and puts you at the entrance early, when the basins are empty and steaming. Carry bear spray and keep real distance from the bison; they look slow and aren’t, and every year someone learns that the hard way. And build slack into the schedule for the traffic jams — when the herd is on the road, you are not going anywhere fast.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-yellowstone',
    id:    { _type: 'slug', current: 'yellowstone' },
    pageTitle:  ['YELLOWSTONE'],
    storyTitle: 'Yellowstone National Park Trip Report (4 Days): Geyser Basins, Bison Jams, and Sleeping in the Car Outside the Gate',
    description: 'Four days driving Yellowstone’s figure-eight loop — geyser basins, blue hot springs, the Lower Falls, endless bison jams, and car camping outside the gate.',
    tripDate:  '2023-09-11',
    location:  'Yellowstone National Park, WY',
    coords:    '44°36′N 110°30′W',
    date:      'September 2023',
    distance:  '~400 mi driving',
    elevation: '—',
    duration:  '4 days',
    category:  'mountain',
    tags:      ['photography', 'camping', 'hiking', 'golden-hour'],
    accentColor: '#C2864A',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A sunstar bursts through rising steam over the reflecting travertine pools of Mammoth Hot Springs at Yellowstone' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Permit',       value: 'Entrance fee · $35/vehicle, 7 days',  status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',   value: 'Easy — driving + boardwalks',         status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Window',  value: 'Sep–Oct, fewer crowds',               status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Crowds',       value: 'Lighter after Labor Day',             status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Cell Service', value: 'Spotty to none inside the park',      status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Wildlife',     value: 'Bison + bears — give them room',      status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Driving',      value: 'Grand Loop ~140 mi · plan for hours',  status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Camping',      value: 'Slept in the car outside the west gate', status: '' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '68°F / 34°F',     subtext: 'warm days, frosty dawns' },
      { _type: 'conditionItem', _key: k(), icon: '⛅', label: 'Sky',         value: 'Sun & showers',   subtext: 'a rainbow most evenings' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Light',           subtext: 'calm in the basins' },
      { _type: 'conditionItem', _key: k(), icon: '🦬', label: 'Wildlife',    value: 'Bison on the move', subtext: 'rut season — herds on the roads' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: yellowstone  (/expedition/yellowstone)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
