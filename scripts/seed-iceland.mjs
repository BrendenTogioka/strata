/**
 * Seed the Iceland trip post: uploads the photo set + creates the trip
 * document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-iceland.mjs
 *   (reads PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN from .env)
 *
 * Safe to re-run — createOrReplace() with a deterministic _id. HEIC originals
 * were converted to JPG (and orientation-corrected) into iceland/_converted/.
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
const SRC = '/Users/admin/Downloads/iceland'
const CONV = resolve(SRC, '_converted')   // orientation-corrected HEIC→JPG

// abs path per role (HEIC roles point at the converted JPGs)
const PHOTOS = {
  hero:    resolve(CONV, 'main.jpg'),            // Kirkjufell + Kirkjufellsfoss
  ovw:     resolve(SRC,  '2-DJI_0101.jpg'),      // layered mountain + river, aerial
  church:  resolve(SRC,  '1-DJI_0109.jpg'),      // lone church on plain, aerial
  bay:     resolve(CONV, 'IMG_6660_f90wrx.jpg'), // black-sand bay + headland
  cone:    resolve(SRC,  '9-IMG_7078.jpg'),      // person in field, volcanic cone
  fall:    resolve(SRC,  '4-IMG_6597-3.jpg'),    // waterfall in lava, snowy peak
  rift:    resolve(SRC,  '5-IMG_6594.jpg'),      // Þingvellir rift pool
  gullfoss:resolve(SRC,  '8-PANA0771_Original.jpg'), // Gullfoss + person
  lagoonAir:resolve(SRC, '3-IMG_6630-3.jpg'),    // Jökulsárlón aerial
  lagoonDusk:resolve(SRC,'6-PANA1303-3.jpg'),    // lagoon at dusk + glacier
  bergs:   resolve(SRC,  'IMG_6657.png'),        // blue icebergs, daytime
  cave:    resolve(CONV, 'IMG_5730_gnqgnp.jpg'), // ice cave, couple
  moss:    resolve(SRC,  'iceland_eldwv2.jpg'),  // Eldhraun moss, dusk + moon
  lagoonNight:resolve(CONV,'IMG_6752_rv4hqx.jpg'),// Sky Lagoon at night + aurora
  aurora:  resolve(SRC,  '7-PANA1343.jpg'),      // aurora over lava field
}

// ── Key generator ───────────────────────────────────────────────────────────
let _n = 0
const k = () => `i${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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

async function run() {
  console.log(`\n🇮🇸  Seeding Iceland → ${projectId} / ${dataset}\n`)

  // Upload every photo, keyed by role.
  const ref = {}
  for (const [role, filePath] of Object.entries(PHOTOS)) {
    if (!existsSync(filePath)) { console.error(`❌  Missing image: ${filePath}`); process.exit(1) }
    const ext = extname(filePath).toLowerCase()
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg'
    const asset = await client.assets.upload('image', createReadStream(filePath), { filename: basename(filePath), contentType })
    ref[role] = { _type: 'reference', _ref: asset._id }
    console.log(`📷  ${basename(filePath)}  →  ${asset._id}`)
  }

  // image/gallery builders that close over ref
  const img = (role, alt, caption) => ({
    _type: 'storyBlock', _key: k(), type: 'image',
    image: { _type: 'image', asset: ref[role], alt, ...(caption ? { caption } : {}) },
  })
  const gallery = (layout, items) => ({
    _type: 'storyBlock', _key: k(), type: 'gallery', layout,
    images: items.map(([role, alt, caption]) => ({ _type: 'image', _key: k(), asset: ref[role], alt, ...(caption ? { caption } : {}) })),
  })

  const story = [
    // ── Overview ─────────────────────────────────────────────────────────
    section('overview', 'A week of weather and water'),
    text(
      'We had a week in Iceland in October and a rental car with no fixed plan beyond a loose loop — Snæfellsnes in the west, the Golden Circle, and the south coast out to the glaciers. October is shoulder season: the summer crowds gone, the first snow dusting the higher peaks, and just enough darkness returning at night to make the aurora possible.',
      'The weather was cloudy most days and never quite settled. Rain moved through in bands, the wind rarely stopped, and the light shifted from flat grey to sudden gold and back within an hour. We learned to drive toward the breaks in the cloud and pull over whenever the road offered something — a waterfall off the shoulder, a black-sand bay, a field of moss running to the sea. Most of the country, it turned out, is exactly that kind of pull-over.',
    ),
    img('ovw', 'Aerial view of a layered green-and-gold Icelandic mountain cut by a winding river, snow on the ridgeline', 'The interior near the west — layered rock, moss, and meltwater.'),
    divider(),

    // ── Snæfellsnes ──────────────────────────────────────────────────────
    section('custom', 'Kirkjufell and the West', 'Snæfellsnes'),
    text(
      'Snæfellsnes is a peninsula that packs most of Iceland into one short drive — a volcano under ice, black beaches, fishing towns, and Kirkjufell, the pointed peak that shows up on every postcard. We reached the falls below it in the late afternoon with the wind coming hard off the water. The mountain kept its shape against a moving sky; the small waterfall in front of it never stopped.',
    ),
    img('church', 'Aerial view of a small white-and-red Icelandic church alone on a golden plain above a fjord, mountains beyond', 'A lone church on the plain above the fjord.'),
    text(
      'We spent a full day circling the peninsula — a black-sand cove below a flat-topped headland, a hillside of moss in the last gold light, meltwater dropping through lava rock beneath a snowed-in peak. Nothing was crowded. Half the stops weren’t marked on anything.',
    ),
    gallery('strip', [
      ['bay',  'A black-sand bay curving below a flat-topped green headland and a small coastal town', 'Black-sand bay below the headland.'],
      ['cone', 'A person standing in a mossy field in golden light below a snow-dusted volcanic cone'],
      ['fall', 'A small waterfall dropping through dark lava rock with a snow-covered mountain behind'],
    ]),
    quote('“You stop planning the day around sights and start planning it around the weather — driving toward whatever patch of sky looks like it might open.”'),

    // ── Golden Circle ────────────────────────────────────────────────────
    section('custom', 'Þingvellir and Gullfoss', 'The Golden Circle'),
    text(
      'The Golden Circle is the easy loop east of Reykjavík, and it earns the traffic. At Þingvellir the land splits where the North American and Eurasian plates pull apart — a rift you can walk down into, the rock walls streaked with moss, clear water standing in the cracks. It is one of the few places you can stand in the gap between two continents.',
    ),
    img('rift', 'A clear, still pool in a mossy volcanic rift at Þingvellir with a snow-capped mountain behind', 'Þingvellir — standing water in the rift between two plates.'),
    text(
      'Gullfoss came later in the day, the spray hanging in the air long before we reached the edge. The river drops in two stages into a canyon and throws up enough mist to soak everything downwind. We stood at the lip until the cold worked through our layers.',
    ),
    img('gullfoss', 'A person in a yellow jacket standing on a cliff edge above the powerful two-tiered Gullfoss waterfall in heavy mist', 'Gullfoss — the canyon disappears into its own spray.'),
    callout('Golden Circle · Þingvellir + Gullfoss · 45°F, mist'),

    // ── Glaciers & Ice ───────────────────────────────────────────────────
    section('custom', 'Jökulsárlón and the Ice Cave', 'Glaciers & Ice'),
    text(
      'The drive east along the south coast is long and mostly empty — farms, waterfalls, lava fields under moss — until the glaciers start coming down to meet the road. Jökulsárlón is where one of them calves into a lagoon: a tongue of ice from Vatnajökull breaking off into bergs that drift toward the sea, some white, some that deep filtered blue, some streaked black with old ash.',
    ),
    img('lagoonAir', 'Aerial view of icebergs floating in the grey Jökulsárlón glacier lagoon under an overcast sky', 'Jökulsárlón from above — bergs drifting toward the sea.'),
    text(
      'We came back to the lagoon at dusk when the crowds thinned. The glacier sat low under the cloud, the water went still, and the bergs turned the colour of the sky. The next morning we pulled on crampons for a guided walk into an ice cave under the glacier — blue ice overhead, meltwater dripping through, the whole ceiling glowing where the light found it.',
    ),
    gallery('grid', [
      ['lagoonDusk', 'Icebergs reflected in the still Jökulsárlón lagoon at dusk with the glacier tongue and clouds behind', 'Dusk on the lagoon, the glacier behind.'],
      ['bergs',      'Bright blue icebergs floating in the glacier lagoon on an overcast day'],
    ]),
    img('cave', 'Two people standing inside a blue ice cave under a glacier, with guides and dripping meltwater', 'Inside the ice cave — blue ice and steady drip, guided from the glacier’s edge.'),
    quote('“The blue isn’t painted on — it’s what’s left after the ice has pressed every bubble of air out of itself over a few hundred years.”'),

    // ── Hot Springs & Aurora ─────────────────────────────────────────────
    section('custom', 'Warm water, green sky', 'Hot Springs & Aurora'),
    text(
      'By evening the light was gone by six, and the country changed character. We crossed the Eldhraun lava field at dusk — miles of moss over old eruption, soft and grey-green, a thin crescent moon over the ridge — and felt how empty the south gets once the day-trippers drive home.',
    ),
    img('moss', 'Twilight over the mossy Eldhraun lava field with a pink sky and a crescent moon above a dark ridge', 'Eldhraun at dusk — moss over old lava, a crescent moon.'),
    text(
      'Back near Reykjavík we spent a night at the Sky Lagoon, an infinity-edge geothermal pool that runs out toward the ocean and the town lights. The water sat warm against the cold air and steam came off the surface. While we were in it the clouds thinned and a faint green band of aurora slid across the sky over the edge of the pool.',
    ),
    img('lagoonNight', 'People in the Sky Lagoon geothermal pool at night with a green band of aurora in the clouds and town lights on the horizon', 'Sky Lagoon at night — warm water, the first green overhead.'),
    text(
      'We chased the aurora properly on two clear nights, driving out of the light into the lava fields and waiting. It came slowly the first night and then all at once — a green arc that brightened, stretched, and rippled before fading back into ordinary cloud. The cold made it hard to hold the camera steady. Nobody suggested leaving.',
    ),
    img('aurora', 'Green northern lights arcing across a dark sky above a faintly lit Icelandic lava field', 'Aurora over the lava — green that stretches and ripples, then goes.'),
    callout('Two clear nights · aurora active · −2°C, no wind'),
    divider(),

    // ── Final Thoughts ───────────────────────────────────────────────────
    section('final', 'What the island leaves you with'),
    text(
      'Iceland in a week is a sampler — you see a lot and understand almost none of it. What stays with us is the speed of the weather and the scale of the water: rain to sun in minutes, rivers everywhere, ice the colour of nothing else, and steam rising out of the ground like the island is still being built. Which it is.',
      'We went in October partly for the dark, and the dark paid off — the aurora, the long blue dusks, the empty roads. The cloud we’d worried about turned out to be the point. It moved constantly, and every time it broke, the country looked like something new.',
    ),
    hindsight(
      'Book the ice cave and Sky Lagoon before you fly — both sell out, and the cave only runs as a guided tour. Pack real layers and a windproof shell; the wind, not the temperature, is what gets you. And download an aurora forecast app — the alerts pulled us outside on the one night we’d nearly written off.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-iceland',
    id:    { _type: 'slug', current: 'iceland' },
    pageTitle:  ['ICELAND'],
    storyTitle: 'Iceland Self-Drive Trip Report (7 Days): Waterfalls, Glaciers, an Ice Cave, and the Northern Lights',
    description: 'A week driving Iceland in October — Snæfellsnes, the Golden Circle, glacier lagoons, an ice cave, hot springs, and the aurora.',
    tripDate:  '2022-10-10',
    location:  'South & West Iceland',
    coords:    '64°08′N 21°56′W',
    date:      'October 2022',
    distance:  '~1,000 mi driving',
    elevation: '—',
    duration:  '7 days',
    category:  'arctic',
    tags:      ['photography', 'night-sky', 'water', 'remote'],
    accentColor: '#4E94A6',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'Kirkjufell mountain and Kirkjufellsfoss waterfall under a moving sky, a person standing at the falls' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Permit',        value: 'None — public roads & sites',     status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Difficulty',    value: 'Easy — driving + short walks',     status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Window',   value: 'Sep–Mar for aurora',               status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Vehicle',       value: '2WD fine on paved routes',         status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Cell Service',  value: 'Reliable on main roads',           status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Reservations',  value: 'Ice cave + Sky Lagoon: book ahead', status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Crowds',        value: 'Light in shoulder season',         status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Hazards',       value: 'High wind, ice, fast-changing weather', status: 'warn' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡',  label: 'Temperature', value: '45°F / 34°F', subtext: 'cool and damp' },
      { _type: 'conditionItem', _key: k(), icon: '☁️', label: 'Sky',         value: 'Overcast',    subtext: 'breaking at night' },
      { _type: 'conditionItem', _key: k(), icon: '💨', label: 'Wind',        value: '15–25 mph',   subtext: 'steady on the coast' },
      { _type: 'conditionItem', _key: k(), icon: '🌙', label: 'Moon Phase',  value: 'Dark',        subtext: 'good aurora odds' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: iceland  (/expedition/iceland)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
