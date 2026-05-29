/**
 * Seed the Oaxaca · Día de los Muertos trip post: uploads the photo set +
 * creates the trip document live in the production dataset.
 *
 * Usage:
 *   node scripts/seed-oaxaca-dia-de-muertos.mjs
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
const SRC = '/Users/admin/Desktop/Locations/oaxaca dia de los muertos'

const PHOTOS = {
  hero:    'main.jpg',           // giant Catrina mojiganga puppet lit up over a night crowd
  street:  'DSCF2000.jpg',       // market alley strung with rainbow papel picado at dusk
  catrina: '1-DSCF2741.jpg',     // woman in Catrina makeup + red rose crown, string lights behind
  lantern: 'DSCF2034.jpg',       // Catrina in black/white dress holding a marigold-topped lantern staff
  moji:    'DSCF2122.jpg',       // towering Catrina puppet in Oaxacan dress beneath papel picado tunnel
  wall:    'DSCF3245.jpg',       // Catrina portrait against a wall of orange marigolds
  pair:    'DSCF4984.jpg',       // two people in gold-and-white skeleton makeup at night
  chiles:  'DSCF2324.jpg',       // market stall piled with dried chiles in red sacks
  crates:  'DSCF2326.jpg',       // stacked blue/yellow/red produce crates above citrus
  monte:   '6-DSCF5635.jpg',     // hatted figure overlooking the Monte Albán plaza
  fret:    '3-DSCF5997.jpg',     // carved geometric stone fretwork at Mitla under a reed ceiling
  steps:   '4-DSCF5966.jpg',     // person resting on the fretwork-friezed steps at Mitla
  cactus:  '2-DSCF5509.jpg',     // organ-pipe cactus garden mirrored in a still pool
  cempasu: 'DSCF2433.jpg',       // graveside candles among red cockscomb and marigolds at night
  santo:   '8-DSCF2866.jpg',     // Catrina in a red dress before the floodlit Santo Domingo church
}

// ── Key generator (Sanity array items need a _key) ──────────────────────────
let _n = 0
const k = () => `o${(_n++).toString(36)}${Date.now().toString(36).slice(-4)}`

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
  console.log(`\n💀  Seeding Oaxaca · Día de los Muertos → ${projectId} / ${dataset}\n`)

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
    section('overview', 'A city dressed for the dead'),
    text(
      'Oaxaca de Juárez sits in a high valley in southern Mexico, a little over five thousand feet up and ringed by dry mountains. The old center is low and walkable — stone churches the color of sand, courtyards behind heavy doors, streets that fold into markets without warning. We arrived the afternoon before Día de los Muertos began, and the city was already getting ready: marigolds stacked on every corner, banners of cut paper going up over the streets, a smell of copal smoke and frying somewhere close.',
      'We gave ourselves six days — the day before the holiday opened through a few days after the crowds thinned — because we wanted the whole arc of it, not just the famous nights. The build-up, the two big evenings, and the quiet mornings after, when the petals are still on the ground and the city is hungover and gentle.',
      'It is not Halloween, though it borrows the same week. Día de los Muertos is a welcome. Families clean and dress the graves, lay out marigolds and the food the dead loved in life, and sit up to keep them company. The public version of that happens in the streets, loud and joyful. The private version happens in the cemeteries, after dark, and is one of the quietest things we have ever stood near.',
    ),
    imageBlock(ref.street, 'A narrow Oaxaca market street strung overhead with rows of brightly colored papel picado banners as people pass the lit stalls below', 'The first evening — papel picado strung the length of a market street, the stalls just lighting up.'),
    divider(),

    // ── The Nights ─────────────────────────────────────────────────────────
    section('custom', 'Into the comparsas', 'The Nights'),
    text(
      'The festival lives at night. Comparsas — roving street parades with brass bands, mezcal passed hand to hand, and giant puppets — start somewhere in the Centro and pull everyone in behind them. The system for finding one is simple: you hear a tuba two streets over and you walk toward it. Within a block you are inside a moving crowd, and somewhere ahead a mojiganga — a towering papier-mâché Catrina — is swaying over the rooftops on a dancer’s shoulders.',
    ),
    imageBlock(ref.catrina, 'A woman in white Catrina face paint and a red rose crown, dressed as an elegant skeleton, standing amid string lights and a blurred night crowd', 'A Catrina in the crowd — white face, ringed eyes, roses in the hair, string lights smeared behind her.'),
    text(
      'The makeup is the heart of it. Half the city paints up as La Catrina, the tall elegant skeleton drawn a century ago as a joke about pretending you are above death. People spend hours on it — white base, dark rings around the eyes, a stitched line drawn across the lips, marigolds and gold worked into the hair. Strangers stop in the street and hold still to be photographed, then thank you for it. Nobody is in a hurry.',
    ),
    gallery('grid', [
      [ref.lantern, 'A woman in Catrina makeup and a sunflower crown, in a black-and-white ruffled dress, holding a tall staff topped with a glowing lantern and marigolds', 'Lit by her own lantern — the marigold and the flame are both part of guiding the dead home.'],
      [ref.moji, 'A towering Catrina puppet in a traditional teal-and-white Oaxacan dress, photographed from below beneath an arched tunnel of colorful papel picado', 'A mojiganga puppet under a tunnel of cut paper — these are carried through the comparsas on a single dancer’s shoulders.'],
    ]),
    callout('Oct 31 · comparsa through the Centro · brass band, mezcal, and a tuba you follow by ear'),

    // ── The Catrinas ───────────────────────────────────────────────────────
    section('custom', 'Painted for the night', 'Portraits'),
    text(
      'Up close the costumes are extraordinary — not just face paint but gold leaf laid along the collarbones, ribs drawn down the arms, embroidered huipiles, crowns of real flowers and beaten metal. It reads as theater from across a plaza and as devotion from a foot away. We kept being let in close, kept being trusted with it.',
    ),
    imageBlock(ref.wall, 'A woman in detailed Catrina makeup and a crown of red roses and gold spikes, posed against a dense wall of orange marigolds', 'A Catrina against a wall of cempasúchil — the marigold whose scent is said to lead the dead back for the night.'),
    quote('“They don’t paint themselves as the dead to mock them. They do it to keep the dead company for one night, and to look good doing it.”'),

    // ── The Mercado ──────────────────────────────────────────────────────────
    section('custom', 'Mole, chiles, and copal', 'The Mercado'),
    text(
      'Daytimes belonged to the markets. Oaxaca is a food city before it is anything else — the home of the seven moles and of more shapes and shades of dried chile than we knew existed — and the mercados are where you feel that. We followed our noses through aisles of mole paste sold by the kilo, baskets of grasshoppers, towers of produce, and the marigolds going out by the armful for the altars and the graves.',
    ),
    gallery('grid', [
      [ref.chiles, 'A market stall piled high with mounds of dark dried chiles, some spilling from large red woven sacks', 'Dried chiles by the sackful — the backbone of Oaxaca’s moles, sorted by heat, color, and name.'],
      [ref.crates, 'Tall stacks of blue, yellow, and red plastic produce crates rising behind a foreground of oranges and other citrus', 'Behind the citrus, the crates run to the ceiling — the market is a working pantry, holiday or not.'],
    ]),

    // ── Day Trips ────────────────────────────────────────────────────────────
    section('custom', 'Out to the valleys', 'Day Trips'),
    text(
      'Between the nights we drove out into the Central Valleys, the wide dry basins that fan out from the city. This is mezcal country — agave to the horizon, with the old places of the Zapotec and Mixtec set into the hills. Monte Albán sits on a ridge that was flattened by hand more than two thousand years ago, a grand plaza of pyramids and platforms with the whole valley laid out below it.',
    ),
    imageBlock(ref.monte, 'A figure in a wide-brimmed hat and shoulder bag stands on a rise overlooking the broad grass plaza and stone platforms of Monte Albán', 'Monte Albán from the high end of the plaza — a Zapotec capital built on a mountain levelled by hand.'),
    text(
      'East of the city, Mitla is a different kind of marvel: walls covered in greca, geometric mosaics cut from thousands of small stones and fitted together without mortar, each step locked to the next. No two panels repeat. We sat in the cool of it for a while, then climbed back out into the white midday light.',
    ),
    gallery('grid', [
      [ref.fret, 'A long wall of intricate geometric stone fretwork at Mitla, raking light catching the relief, a reed ceiling above', 'Mitla’s greca — thousands of cut stones set without mortar, no two panels alike.'],
      [ref.steps, 'A person in a hat sitting on the broad stone steps of a Mitla building below a frieze of geometric fretwork against a deep blue sky', 'A rest on the steps at Mitla, the fretwork frieze running the length of the wall behind.'],
    ]),
    text(
      'Closer to home, the city’s ethnobotanical garden gathers the plants the whole region is built on — towering organ-pipe cactus, century plants throwing up their flower stalks, the agaves that become mezcal. Late in the afternoon the columns stood mirrored in a long reflecting pool, and for a minute it was completely silent.',
    ),
    imageBlock(ref.cactus, 'Rows of tall organ-pipe cactus and prickly pear mirrored perfectly in a still reflecting pool, a lone figure on the path beyond', 'The ethnobotanical garden — organ-pipe cactus doubled in a still pool, the valley’s whole botany in one frame.'),

    // ── The Vigil ────────────────────────────────────────────────────────────
    section('custom', 'The cemetery after dark', 'The Vigil'),
    text(
      'On the night of the first into the second, we went out to one of the village cemeteries beyond the city. This is the part the comparsas are a celebration of, and it is the opposite of them — hushed. Families had spent the day building the graves into gardens of orange marigold and deep-red cockscomb, and now they sat among the candles, talking low, eating, waiting. Somewhere a small band played, then stopped. We kept to the edges and tried to take up no room.',
    ),
    imageBlock(ref.cempasu, 'White candles burning low among mounds of red cockscomb and orange marigolds on graves in a dark cemetery at night', 'A grave dressed for the vigil — candles, cockscomb, and cempasúchil, lit and tended through the night.'),
    text(
      'No one was sad in the way an outsider expects a cemetery to be sad. The dead were simply expected, and the living had laid a table and lit the way. We left before midnight, walking back past graves that would stay lit until dawn, and didn’t say much in the car.',
    ),

    // ── Final Thoughts ───────────────────────────────────────────────────────
    section('final', 'What you carry home'),
    text(
      'Oaxaca over Día de los Muertos is two festivals at once. There is the loud one — the comparsas, the puppets, the painted faces, mezcal in the street until late — and underneath it the quiet one, the families at the graves doing the actual work the whole week is about. The city lets you stand in both, and trusts you not to confuse the spectacle for the substance.',
      'What stays with us is how unafraid of death the whole thing is — how it treats the dead as guests with a standing invitation rather than as something to be gotten over. We came for the photographs and the parade and left thinking differently about the holiday we grew up with. Six days was enough to see it and nowhere near enough to belong to it. We’d go back, and next time we’d stay quieter, longer.',
    ),
    imageBlock(ref.santo, 'A Catrina in a tiered deep-red dress and flower crown stands among agave plants before the floodlit baroque facade of the Templo de Santo Domingo at night', 'Last night in the Centro — a Catrina before the lit facade of Santo Domingo, the festival winding down around her.'),
    hindsight(
      'Book lodging months ahead — downtown Oaxaca fills up by spring for these dates, and you want to be inside the walkable center where the comparsas pass. Give it the full span rather than flying in just for November 2nd; the build-up and the morning-after are half of it. If you go to a cemetery vigil, treat it as the family event it is: no flash in people’s faces, ask before you photograph a grave, and consider a less-touristed panteón over the famous ones. The altitude is mild but the midday sun is strong — hat, water, and save the heavy days for the cool of the markets and the cool of the night.',
    ),
  ]

  const doc = {
    _type: 'trip',
    _id:   'trip-oaxaca-dia-de-muertos',
    id:    { _type: 'slug', current: 'oaxaca-dia-de-muertos' },
    pageTitle:  ['OAXACA', 'DÍA DE MUERTOS'],
    storyTitle: 'Oaxaca for Día de los Muertos (6 Days): Comparsas, Catrinas, Candlelit Cemeteries, and the Valley Towns of Monte Albán and Mitla',
    description: 'Six days in Oaxaca for Día de los Muertos — comparsas and Catrinas, candlelit cemeteries, mole markets, and the ruins of Monte Albán.',
    tripDate:  '2025-10-31',
    location:  'Oaxaca de Juárez, Oaxaca, Mexico',
    coords:    '17°04′N 96°43′W',
    date:      'November 2025',
    distance:  '—',
    elevation: '~5,100 ft (1,555 m)',
    duration:  '6 days · 5 nights',
    category:  'city',
    tags:      ['photography', 'cultural', 'festival', 'food', 'architecture', 'history'],
    accentColor: '#D9682A',
    featured:  false,
    heroImage: { _type: 'image', asset: ref.hero, alt: 'A giant illuminated Catrina mojiganga puppet with a feathered hat towers over a crowd of phones on a Oaxaca street at night during Día de los Muertos' },
    fieldIntel: [
      { _type: 'intelRow', _key: k(), key: 'Getting There',      value: 'Fly to OAX, often via Mexico City',   status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Best Window',        value: 'Oct 31–Nov 2 for the holiday',        status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Crowds',             value: 'Packed downtown — book months ahead', status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Elevation',          value: '~5,100 ft — mild altitude',           status: ''     },
      { _type: 'intelRow', _key: k(), key: 'Day Trips',          value: 'Monte Albán, Mitla, Hierve el Agua',  status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Safety',             value: 'Felt safe; normal city sense',        status: 'good' },
      { _type: 'intelRow', _key: k(), key: 'Cemetery Etiquette', value: 'Real vigils — ask, no flash, hang back', status: 'warn' },
      { _type: 'intelRow', _key: k(), key: 'Mezcal',             value: 'Palenque visits out in the valleys',  status: 'good' },
    ],
    conditions: [
      { _type: 'conditionItem', _key: k(), icon: '🌡', label: 'Temperature', value: '78°F / 52°F',   subtext: 'warm days, cool nights' },
      { _type: 'conditionItem', _key: k(), icon: '☀️', label: 'Sky',         value: 'Dry & sunny',   subtext: 'late in the dry season' },
      { _type: 'conditionItem', _key: k(), icon: '🌼', label: 'Marigolds',   value: 'Peak bloom',    subtext: 'cempasúchil on every corner' },
      { _type: 'conditionItem', _key: k(), icon: '🕯', label: 'Nights',      value: 'Comparsas late', subtext: 'the streets stay loud' },
    ],
    story,
  }

  await client.createOrReplace(doc)
  console.log(`\n✅  Created trip: oaxaca-dia-de-muertos  (/expedition/oaxaca-dia-de-muertos)\n`)
}

run().catch((err) => { console.error('\n❌  Seed failed:', err.message); process.exit(1) })
