/**
 * Seed the Lakes Trail (Sequoia NP) trip post: uploads the photo set + creates
 * the trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-lakes-trail.mjs
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
const SRC = '/Users/admin/Desktop/Locations/sequoia np lakes trail'

const PHOTOS = {
  hero:     'main.jpg',        // dusk over the basin, one of us on the slabs above a tarn
  ovw:      'P1012609.jpg',    // dusk reflection, big granite wall, tiny lone figure on the shore
  portrait: 'P1012602.jpg',    // hiker in white sun hoodie, cap, mirrored shades, loaded pack
  arrive:   'P1012662.jpg',    // person on a slab at the lake edge, granite wall reflected
  morning:  'P1012647.jpg',    // twin pines on slabs, still lake, jagged peaks in calm light
  dusk:     'P1012715.jpg',    // telephoto granite ridge fading into peachy wildfire haze
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `l${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n🏔  Seeding Lakes Trail (Sequoia) → ${projectId} / ${dataset}\n`)

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
    section('overview', 'Our first nights in the backcountry'),
    text(
      'The Lakes Trail climbs out of Sequoia’s Wolverton trailhead and works its way up to a string of glacier-cut lakes below Alta Peak — Heather, Emerald, and Pear, each one higher and more bare than the last. It was our first backpacking trip. Ever. We’d day-hiked plenty, but never carried everything we needed on our backs and slept on it, and we picked a trail that packs a lot of California high country into a short distance: red fir forest at the bottom, a cliff ledge in the middle, and open granite at the top.',
      'We went in late September for two nights, packs heavier than they needed to be and no real idea how any of it would feel. The plan was simple — climb to the lakes, make camp, filter water, and figure the rest out as we went. Most of what we learned, we learned in the first afternoon.',
      'The skies that week were hazy with smoke drifting in from fires somewhere to the west, which turned every sunset peach and gold and softened the granite to something almost unreal. We’d have traded it for clear blue and didn’t get the choice. It made the evenings strange and beautiful anyway.',
    ),
    imageBlock(ref.ovw, 'A still alpine lake at dusk reflecting a towering granite cliff, with a small lone figure standing on the far shore', 'Dusk over the basin — the granite wall holding the last of the light, one of us out on the shore for scale.'),
    divider(),

    // ── Day 1 ────────────────────────────────────────────────────────────
    section('day', 'The forest, then the Watchtower'),
    text(
      'The trail starts gently, in shade — lodgepole and red fir, soft duff underfoot, the sound of Wolverton Creek somewhere off to the side. For the first couple of miles it felt like a long day hike, and we let ourselves believe the packs weren’t that bad. Then the trail forks: the Hump, which climbs straight up through the trees, or the Watchtower, which contours out across the face of a granite dome. We took the Watchtower.',
      'It’s a ledge — in places blasted into the side of the cliff, a few feet wide, with a long drop to the Tokopah Valley floor far below. The forest just ends and you’re out on bare rock with the whole canyon opening underneath you. We went slow, hands closer to the wall than we’d admit, and didn’t say much. It’s the kind of stretch that makes a first backpacking trip feel like a real one.',
    ),
    imageBlock(ref.portrait, 'A hiker in a white sun hoodie, brimmed cap, and mirrored sunglasses standing in front of a granite-walled lake with a loaded backpack', 'Sun hoodie, brimmed cap, and the loudest sunglasses we owned — dressed for the exposed granite above the trees.'),
    text(
      'Past the Watchtower the trail keeps to the side of the mountain, traversing slab and scree with the lakes basin slowly coming into view ahead. The trees thin to scattered pines clinging to cracks in the rock. By the time we dropped our packs at the lake the afternoon light had gone long and gold, and the weight we’d been cursing for hours suddenly didn’t matter.',
    ),
    imageBlock(ref.arrive, 'A person standing on a granite slab at the edge of a calm lake, looking up at a sunlit granite mountainside mirrored in the water', 'First camp. Packs off, boots off, just standing there looking at the wall reflected in the lake.'),
    callout('Day 1 · Wolverton → the Watchtower → the lakes · ~6 mi, +2,300 ft · hazy, warm'),
    quote('“We kept waiting for the hard part to feel like a mistake. It never did — it just felt like the point.”'),

    // ── Day 2 ────────────────────────────────────────────────────────────
    section('day', 'A full day at the lakes'),
    text(
      'We woke up cold. Nobody warns you enough about how cold a clear night at nine thousand feet gets, even in September — there was frost on the tent and the water in our bottles had gone near slush. But the sun hits the granite early and the basin warms fast, and by mid-morning we were down at the water filtering for the day. Water was the one thing the trail had plenty of: creeks crossing the path on the way up, snowmelt feeding the lakes, all of it cold and clear. We filtered liters of it and never thought twice.',
    ),
    imageBlock(ref.morning, 'Two tall pines on a granite slab beside a still lake in soft morning light, with jagged granite peaks reflected in the water', 'Morning calm — twin pines on the slabs, the peaks doubled in the lake before any wind picked up.'),
    text(
      'With nowhere to be, we spent the day wandering higher — up the slabs toward Pear Lake, scrambling granite that had been polished smooth by ice a long time ago, stopping wherever a view or a flat warm rock asked us to. This was the part we hadn’t expected: that the best hours of a backpacking trip might be the ones where you don’t really go anywhere. We swam, badly and briefly, in water cold enough to make the decision for us. We ate too many snacks. We watched the light move across the granite all afternoon.',
    ),

    // ── Final Thoughts ───────────────────────────────────────────────────
    section('final', 'What the first one teaches you'),
    text(
      'The hike out went faster than the hike in, the way it always seems to. We crossed back along the Watchtower in the morning while the canyon was still in shade, and the ledge that had felt so serious two days earlier felt almost familiar. By the time the trail dropped back into the fir forest, we’d stopped being people who’d never backpacked.',
      'What stays with us isn’t a summit — there wasn’t one — or the mileage, which wasn’t much. It’s the granite, the smoke-colored sunsets, the cold mornings, and the particular quiet of being somewhere you can only reach on foot. We carried too much, slept badly, and would do it again tomorrow. That’s the whole thing, really. You find out you can, and then you want to.',
    ),
    imageBlock(ref.dusk, 'Layered granite ridgelines fading into peachy wildfire haze at sunset, dark forested slopes below', 'Last light through the smoke — the granite mountain we’d spent two days walking the side of, softening into the haze.'),
    hindsight(
      'Train with a loaded pack before you go — the weight, not the distance, is what wears you down, and we both packed our fears instead of our needs. Bring a real insulation layer and a warmer bag than you think you’ll need; the nights at the lakes drop near freezing even in late summer. A bear canister is required here, so plan your food around what fits inside one. And take the Watchtower over the Hump if heights allow — it’s the best stretch of the whole trail, and you only get the canyon view on the way up.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-lakes-trail-sequoia',
    id:    { _type: 'slug', current: 'lakes-trail-sequoia' },
    pageTitle:  ['LAKES', 'TRAIL'],
    storyTitle: 'Lakes Trail Trip Report (2 Nights): Our First Backpacking Trip — The Watchtower, Granite, and Sequoia’s High Country',
    description: 'Our first backpacking trip ever — two nights on Sequoia’s Lakes Trail, climbing through forest to the Watchtower and a basin of granite-rimmed alpine lakes.',
    tripDate:  '2024-09-25',
    location:  'Lakes Trail, Sequoia National Park, CA',
    coords:    '36°36′N 118°40′W',
    date:      'September 2024',
    distance:  '~12 mi round trip',
    elevation: '+2,300 ft',
    duration:  '3 days · 2 nights',
    category:  'mountain',
    tags:      ['backpacking', 'camping', 'water', 'golden-hour'],
    accentColor: '#BE6A40',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A hiker sitting on a granite slab at dusk above a small alpine lake, distant peaks glowing peach under a smoky sky' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Permit',          value: 'Wilderness permit required — quota',  status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',      value: 'Moderate — ~6 mi, +2,300 ft to camp', status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Window',     value: 'Jul–Oct, snow-free',                  status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Water Source',    value: 'Plentiful — creeks + lakes, filter',   status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Cell Service',    value: 'None past the trailhead',                  status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Crowds',          value: 'Steady — popular permit zone',         status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Bear Canister',   value: 'Required — store all food + scented',  status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Trailhead Access', value: 'Wolverton, paved road · ~7,300 ft',   status: 'good' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '65°F / 33°F', subtext: 'warm days, frosty nights' },
      { _type: 'conditionItem', _key: k(), icon: '🌫️', label: 'Sky',     value: 'Hazy',           subtext: 'distant wildfire smoke' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: 'Light',          subtext: 'calm at the lakes' },
      { _type: 'conditionItem', _key: k(), icon: '🌊', label: 'Water Temp',  value: '~50°F',      subtext: 'brisk — a quick swim at most' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: lakes-trail-sequoia  (/expedition/lakes-trail-sequoia)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
