/**
 * One-off backfill: fill in missing image `alt` and `caption` on existing trips.
 * Copy was written by hand against each actual photo. Safe to re-run — it only
 * sets the fields listed below and leaves everything else (assets, keys) intact.
 *
 *   node scripts/backfill-alt-captions.mjs
 */
import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
  const [k, v] = line.split('=')
  if (k?.trim() === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v?.trim()
  if (k?.trim() === 'PUBLIC_SANITY_DATASET'    && !process.env.PUBLIC_SANITY_DATASET) dataset = v?.trim() ?? dataset
  if (k?.trim() === 'SANITY_WRITE_TOKEN'       && !token) token = v?.trim()
}
const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

// slug → { [blockIndex]: { alt, caption }  |  { g: { [galleryIndex]: { alt, caption } } } }
const COPY = {
  'santa-cruz-island': {
    6: { alt: 'Two backpackers sitting close together on a wooden picnic table at the campground, packs and a metal food-storage box beside them, eucalyptus trees behind', caption: 'Settled in at Scorpion — packs down, food in the box, eucalyptus closing in overhead.' },
    9: { alt: 'A couple standing together on a golden grassy sea bluff at sunset, looking out over sea cliffs and a cove with offshore rocks, flowering coastal scrub in the foreground', caption: 'Last light from the bluffs above the anchorage, the whole coast going gold.' },
    12: { g: {
      0: { alt: 'A clear turquoise cove with a sea cave cut into the rocky shoreline, agave and coastal scrub on the cliffs under a bright blue sky', caption: 'Clear water and a sea cave along the Prisoners Harbor coast.' },
      1: { alt: 'Two orange, red-spotted Humboldt lilies with recurved petals, backlit against a blurred pine forest and blue sky', caption: 'Humboldt lilies along the trail — a flash of orange in the island’s interior.' },
      2: { alt: 'A pebble beach scattered with hundreds of small stranded blue by-the-wind sailors among the stones, green hills behind under an overcast sky', caption: 'Thousands of blue by-the-wind sailors washed up along the cobbles.' },
    } },
  },
  'havasupai-falls': {
    7:  { alt: 'A person sitting in the turquoise travertine pools below Havasu Falls, the tall waterfall pouring over red rock framed by green cottonwoods', caption: 'First sight of Havasu Falls — the turquoise looks edited until you’re standing in it.' },
    9:  { alt: 'A backpacker crossing a narrow wooden plank bridge over turquoise Havasu Creek in the shade of cottonwood trees', caption: 'A plank bridge over Havasu Creek on the walk in to camp.' },
    12: { g: {
      0: { alt: 'A hiker in a red jacket gripping a chain on the steep, wet descent beside Mooney Falls, the waterfall plunging into a blue pool behind', caption: 'On the chains down past Mooney Falls — wet, steep, and the only way through.' },
      1: { alt: 'Wooden ladders bolted to a travertine cliff draped in hanging greenery at Mooney Falls, a tiny figure for scale', caption: 'Looking back up the Mooney descent, ladders pinned to dripping travertine.' },
      2: { alt: 'A person standing with arms outstretched at the base of Mooney Falls as the waterfall drops into a blue pool', caption: 'At the base of Mooney — nearly two hundred feet of falling water and spray.' },
    } },
    14: { alt: 'Tiered turquoise pools and low travertine waterfalls at Beaver Falls, a person standing on a ledge between them among red walls and greenery', caption: 'Beaver Falls — a staircase of turquoise pools made for getting into.' },
    19: { g: {
      0: { alt: 'The turquoise Havasu Creek winding through tall, layered red sandstone walls in a narrow stretch of canyon', caption: 'The canyon tightening on the long push toward the Confluence.' },
      1: { alt: 'A desert bighorn sheep with full curled horns standing in the milky-turquoise creek below red rock', caption: 'A desert bighorn working across the creek — the canyon’s other local.' },
    } },
    21: { alt: 'A person sitting on a rock ledge where the clear turquoise Havasu Creek meets the deeper green Colorado River beneath a tall red canyon wall', caption: 'The Confluence — Havasu’s turquoise running straight into the green Colorado.' },
  },
  'fairbanks-aurora': {
    13: { alt: 'A person reclining in the steaming water of the Chena Hot Springs rock lake, ringed by large boulders capped with thick snow and rising clouds of steam', caption: 'Chena Hot Springs after dark — water near 105°F, the air far below zero, steam over all of it.' },
    22: { g: { 1: { caption: 'The corona right overhead — green rays shot through with purple, filling the whole sky.' } } },
  },
  'bisti-badlands': {
    13: { g: {
      1: { caption: 'A caprock slab balanced on a neck the wind is still cutting away.' },
      2: { caption: 'Another hard cap holding its spire together as the clay erodes beneath.' },
    } },
  },
  'the-narrows': {
    10: { g: {
      0: { caption: 'A low cascade where the canyon pinches in.' },
      1: { caption: 'Late-fall gold reflected in the cold green river.' },
      2: { caption: 'The walls drawing in and the light dropping as the canyon narrows.' },
    } },
    20: { g: {
      0: { caption: 'A thousand feet of sandstone overhead — you feel very small down here.' },
      1: { caption: 'Wading into a shaft of light in the narrowest stretch.' },
    } },
  },
  'buckskin-gulch': {
    8:  { g: { 1: { caption: 'Purple and tan walls curving over a shallow pool deep in the slot.' } } },
    12: { g: {
      0: { caption: 'Reflected light folding through the layered sandstone.' },
      1: { caption: 'A boulder jam on the floor below a glowing crack of sky.' },
    } },
    19: { g: {
      0: { caption: 'The dog out front, ears up, in a glowing stretch of slot.' },
      2: { caption: 'Ripples crossing one of the silty pools you just have to wade.' },
    } },
    28: { g: {
      0: { caption: 'Out of the slot and into Paria, a great orange amphitheater at our backs.' },
      1: { caption: 'Glowing walls mirrored in the calm brown Paria.' },
      2: { caption: 'A cottonwood gone full yellow against the red rock.' },
    } },
    35: { g: {
      0: { caption: 'A rest on a ledge under one of Paria’s big sandstone domes.' },
      2: { caption: 'Crossing a wide gravel bar where the canyon finally opens up.' },
    } },
  },
  'iceland': {
    8:  { g: {
      1: { caption: 'Golden hour on the moss below a snow-dusted Snæfellsnes cone.' },
      2: { caption: 'Meltwater dropping through the lava, the snowline just above.' },
    } },
    20: { g: { 1: { caption: 'Glacier-blue ice drifting across Jökulsárlón.' } } },
  },
}

const apply = (target, copy) => {
  let n = 0
  if (copy.alt && !(target.alt ?? '').trim())         { target.alt = copy.alt; n++ }
  if (copy.caption && !(target.caption ?? '').trim()) { target.caption = copy.caption; n++ }
  return n
}

async function run() {
  const idMap = await client.fetch(`*[_type=="trip"]{_id,"slug":id.current}`)
  let total = 0
  for (const [slug, blocks] of Object.entries(COPY)) {
    const _id = idMap.find(t => t.slug === slug)?._id
    if (!_id) { console.log('⚠  not found:', slug); continue }
    const doc = await client.getDocument(_id)
    let changed = 0
    for (const [idx, spec] of Object.entries(blocks)) {
      const block = doc.story?.[Number(idx)]
      if (!block) { console.log(`⚠  ${slug} block[${idx}] missing`); continue }
      if (spec.g) {
        for (const [gi, gspec] of Object.entries(spec.g)) {
          const img = block.images?.[Number(gi)]
          if (!img) { console.log(`⚠  ${slug} block[${idx}] gallery[${gi}] missing`); continue }
          changed += apply(img, gspec)
        }
      } else {
        if (!block.image) { console.log(`⚠  ${slug} block[${idx}] has no image`); continue }
        changed += apply(block.image, spec)
      }
    }
    if (changed) { await client.patch(_id).set({ story: doc.story }).commit(); total += changed }
    console.log(`✅  ${slug}: ${changed} field(s) set`)
  }
  console.log(`\n── Done. ${total} fields filled.`)
}
run().catch(e => { console.error('❌', e.message); process.exit(1) })
