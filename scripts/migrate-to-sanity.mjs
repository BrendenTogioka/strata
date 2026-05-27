/**
 * One-time migration: upload local trip images + create Sanity documents
 * from the trips.js data file.
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=skXXX node scripts/migrate-to-sanity.mjs
 *
 * Get a write token from: https://sanity.io/manage → project → API → Tokens
 * Choose "Editor" permission level.
 *
 * Safe to re-run — uses createOrReplace() with deterministic IDs.
 */

import { createClient } from '@sanity/client'
import { createReadStream, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

// ── Load env vars ──────────────────────────────────────────────────────────
// dotenv not installed; read .env manually
import { readFileSync } from 'fs'
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  try {
    const env = readFileSync(resolve(root, '.env'), 'utf8')
    for (const line of env.split('\n')) {
      const [k, v] = line.split('=')
      if (k?.trim() === 'PUBLIC_SANITY_PROJECT_ID') projectId = v?.trim()
      if (k?.trim() === 'PUBLIC_SANITY_DATASET')   dataset   = v?.trim() ?? dataset
    }
  } catch {}
}

const token = process.env.SANITY_WRITE_TOKEN
if (!projectId) { console.error('❌  Set PUBLIC_SANITY_PROJECT_ID in .env or environment'); process.exit(1) }
if (!token)     { console.error('❌  Set SANITY_WRITE_TOKEN environment variable'); process.exit(1) }

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

// ── Trip data ──────────────────────────────────────────────────────────────
// Inline the trip data so this script is self-contained
const trips = [
  {
    id: 'valley-of-fire', num: '01',
    cardTitle: 'VALLEY\nOF FIRE', pageTitle: ['VALLEY', 'OF FIRE'],
    location: 'Nevada, USA', coords: '36°26′N 114°31′W',
    date: 'November 2023', distance: '8.2 mi', elevation: '±1,200 ft', duration: '2 days',
    img: '/images/valley-fire.webp', alt: 'Sandstone waves at Valley of Fire',
    accentColor: '#C04820',
    story: [
      { type: 'text',  content: 'The sandstone here is 150 million years old — Jurassic dunes compressed over geological time into these sweeping waves of red and rose. At golden hour the entire desert ignites. The rock radiates warmth long after the sun drops, a slow release of heat absorbed across the day.' },
      { type: 'quote', content: '"Standing on the wave you feel deep time beneath you — 150 million years of pressure under your boots."' },
      { type: 'text',  content: 'We arrived on purpose at that last hour of light. The ridgeline caught fire first — burgundy to amber to white — and the shadows in the rippled rock turned violet. Wind came down from the north, cold and sharp, but the stone underfoot was still warm. We stayed until there was no light left to shoot.' },
      { type: 'quote', content: '"Every photograph here is a collaboration with ancient water — the same water that carved the Colorado, that ate through half a continent."' },
      { type: 'text',  content: 'The second morning we woke before dawn and drove back in darkness. The sandstone, without sunlight, is almost white — bone and chalk. Then the sun clears the ridge and everything changes in seconds. It is one of the fastest color shifts in nature. You learn to have your camera ready before you think you need it.' },
    ],
  },
  {
    id: 'the-narrows', num: '02',
    cardTitle: 'THE\nNARROWS', pageTitle: ['THE', 'NARROWS'],
    location: 'Zion, Utah', coords: '37°17′N 112°56′W',
    date: 'October 2023', distance: '16 mi', elevation: '±500 ft', duration: '1 day',
    img: '/images/narrows.webp', alt: 'Zion Narrows canyon walls',
    accentColor: '#D0744A',
    story: [
      { type: 'text',  content: 'The Narrows is sixteen miles of slot canyon wading — the Virgin River the only trail. In places the canyon walls close to six feet across. You look up and see a strip of sky hundreds of feet above, narrow as a knife. The rock is dark, layered, ancient. The water is cold even in October.' },
      { type: 'quote', content: '"The light never reaches the canyon floor directly. It arrives already ancient, already amber — bounced off sandstone walls a dozen times before it finds you."' },
      { type: 'text',  content: 'We went in from the bottom with dry suits and trekking poles. The current pushes back at every step. You learn to read the water — the dark green channels are deep, the white froth is shallow rock. The deeper you go, the darker and quieter it becomes, until the canyon feels less like a place and more like a state of mind.' },
    ],
  },
  {
    id: 'aurora-borealis', num: '03',
    cardTitle: 'AURORA\nBOREALIS', pageTitle: ['AURORA', 'BOREALIS'],
    location: 'Northern Europe', coords: '69°40′N 18°56′E',
    date: 'February 2022', distance: '—', elevation: '—', duration: '5 nights',
    img: '/images/aurora.webp', alt: 'Aurora Borealis, Northern Europe',
    accentColor: '#44EE88',
    story: [
      { type: 'text',  content: 'At 2am in a field outside Tromsø, the sky broke open. It started as a faint green smear at the horizon — easy to dismiss, easy to mistake for light pollution from a town somewhere. Then within minutes it was directly overhead, moving, alive, making a sound you feel more than hear.' },
      { type: 'quote', content: '"Charged particles from the sun, hitting our atmosphere at 45 million mph, glowing on impact. Physics. And yet completely inexplicable standing under it."' },
      { type: 'text',  content: 'We stood in that field for three hours. The temperature was -14°C. Nobody suggested going inside. The curtains of light changed color — green to pale violet to white — and shifted faster than you could follow. Every time you thought it was fading, it surged again. By 5am it was gone. The sky just ordinary darkness, stars steady, as if nothing had happened.' },
    ],
  },
  {
    id: 'arctic-dawn', num: '04',
    cardTitle: 'ARCTIC\nDAWN', pageTitle: ['ARCTIC', 'DAWN'],
    location: 'Alaska / Yukon', coords: '63°04′N 141°00′W',
    date: 'March 2022', distance: '12 mi', elevation: '±3,400 ft', duration: '3 days',
    img: '/images/mountains.webp', alt: 'Arctic mountain sunrise',
    accentColor: '#88AACC',
    story: [
      { type: 'text',  content: 'In late winter the Yukon has about six usable hours of light. You plan your whole day around those hours. We were camped on a frozen river, the mountain range across from us still dark when we woke, the peaks igniting one by one as the sun cleared the horizon. Pink clouds dragged across the summit ridge.' },
      { type: 'quote', content: '"The cold makes the light sharper. At -25°C everything has edges — the shadows are absolute, the light almost surgical."' },
      { type: 'text',  content: 'The river ice groaned at night. A deep tectonic sound, as if the earth was settling. In the mornings the surface had shifted and cracked, new pressure ridges appearing while we slept. The landscape here is still actively forming — not ancient in the way the desert is ancient, but alive and moving on timescales just long enough to forget.' },
    ],
  },
  {
    id: 'havasupai-falls', num: '05',
    cardTitle: 'HAVASU\nFALLS', pageTitle: ['HAVASU', 'FALLS'],
    location: 'Grand Canyon, AZ', coords: '36°15′N 112°41′W',
    date: 'April 2024', distance: '20 mi', elevation: '±3,200 ft', duration: '3 days',
    img: '/images/havasupai.webp', alt: 'Havasupai Falls, Grand Canyon',
    accentColor: '#44B8CC',
    story: [
      { type: 'text',  content: 'Ten miles into the canyon on foot to reach water that color. Travertine pools stacked like terraces, fed by springs that run year-round regardless of what the desert does above. The blue-green is not a trick of the light. It is minerals — calcium and magnesium in suspension, refracting short wavelengths. Science that looks like a dream.' },
      { type: 'quote', content: '"You earn this. That is the whole point. The color doesn\'t mean anything until you\'ve carried everything you need on your back to reach it."' },
      { type: 'text',  content: 'We made camp on the canyon floor and swam every morning before the day hikers came down. The falls are louder than you expect. The red sandstone walls bounce the sound and amplify it, so the water fills the whole canyon with white noise. It is easy to sleep.' },
    ],
  },
  {
    id: 'jungle-falls', num: '06',
    cardTitle: 'JUNGLE\nFALLS', pageTitle: ['JUNGLE', 'FALLS'],
    location: 'Southeast Asia', coords: '18°48′N 98°58′E',
    date: 'January 2024', distance: '6 mi', elevation: '±800 ft', duration: '1 day',
    img: '/images/jungle.webp', alt: 'Jungle waterfall, Southeast Asia',
    accentColor: '#5A6A48',
    story: [
      { type: 'text',  content: 'The forest floor here never fully dries. Even in the dry season, the canopy holds moisture from the last rain and releases it slowly for days. By the time we reached the falls — two hours from the trail head — our clothes were soaked from the underbrush alone, long before we reached any water.' },
      { type: 'quote', content: '"Nothing moves quickly in a jungle. The jungle runs on its own logic, its own deep time — and it does not adjust to accommodate you."' },
      { type: 'text',  content: 'The waterfall had no visible source above the canopy. It simply appeared — a white cascade dropping through ferns and roots onto a boulder field, disappearing into the rock and reappearing further down as a stream. We sat with it for a long time. There was no trail beyond it. It was an end point and that felt right.' },
    ],
  },
]

// ── Image path → local file ────────────────────────────────────────────────
const IMAGE_FILES = {
  '/images/valley-fire.webp':  'valley-fire.webp',
  '/images/narrows.webp':      'narrows.webp',
  '/images/aurora.webp':       'aurora.webp',
  '/images/mountains.webp':    'mountains.webp',
  '/images/havasupai.webp':    'havasupai.webp',
  '/images/jungle.webp':       'jungle.webp',
}

async function run() {
  console.log(`\n🌍  Migrating to Sanity project: ${projectId} / ${dataset}\n`)

  // ── Step 1: Upload images ────────────────────────────────────────────────
  const assetRefs = {}

  for (const [imgPath, filename] of Object.entries(IMAGE_FILES)) {
    const filePath = resolve(root, 'public/images', filename)
    if (!existsSync(filePath)) {
      console.warn(`⚠️  Image not found, skipping: ${filePath}`)
      continue
    }
    const stream = createReadStream(filePath)
    const asset  = await client.assets.upload('image', stream, {
      filename,
      contentType: 'image/webp',
    })
    assetRefs[imgPath] = { _type: 'reference', _ref: asset._id }
    console.log(`📷  Uploaded ${filename}  →  ${asset._id}`)
  }

  // ── Step 2: Create trip documents ────────────────────────────────────────
  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i]
    const assetRef = assetRefs[trip.img]

    const doc = {
      _type:      'trip',
      _id:        `trip-${trip.id}`,   // deterministic: safe to re-run
      id:         { _type: 'slug', current: trip.id },
      num:         trip.num,
      cardTitle:   trip.cardTitle,
      pageTitle:   trip.pageTitle,
      location:    trip.location,
      coords:      trip.coords,
      date:        trip.date,
      distance:    trip.distance,
      elevation:   trip.elevation,
      duration:    trip.duration,
      heroImage:   assetRef
        ? { _type: 'image', asset: assetRef, alt: trip.alt }
        : undefined,
      accentColor: trip.accentColor,
      sortOrder:   i + 1,
      story: trip.story.map((block, j) => ({
        _type:   'storyBlock',
        _key:    `block-${j}`,        // required for Sanity array items
        type:    block.type,
        content: block.content,
      })),
    }

    await client.createOrReplace(doc)
    console.log(`✅  Created trip: ${trip.id}`)
  }

  console.log('\n🎉  Migration complete! Open your Sanity Studio to verify.\n')
}

run().catch((err) => {
  console.error('\n❌  Migration failed:', err.message)
  process.exit(1)
})
