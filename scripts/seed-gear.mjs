import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'hmilopzv',
  dataset:   'production',
  apiVersion: '2024-01-01',
  token: 'skbismCeOlG6ClwHpr0TmpHRkBE2iF0pGss6SuIU2OltvQpGB2Vaira1QLUGk0nTNIu2L9f4DtRwoXcGCs88bJduK68ONU41ntX8tVQUi8BvAZ8QMW8BTmOEZe7qL9qTTAMbVpZiRj77rBADG8YF11qrOue2dUwsO8qjK8bO55bqSxDZxQoP',
  useCdn: false,
})

const gear = [
  // ── Camera ─────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Sony a7R V',
    brand: 'Sony',
    category: 'camera',
    description: 'My primary shooter. 61MP sensor handles everything from sweeping ridgeline panoramas to tight wildlife crops without breaking a sweat.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Sony a7C II',
    brand: 'Sony',
    category: 'camera',
    description: 'Compact backup body I reach for on technical scrambles where every gram matters. Shares lenses with the R V seamlessly.',
    featured: false,
  },

  // ── Lenses ─────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Sony FE 16-35mm f/2.8 GM II',
    brand: 'Sony',
    category: 'lens',
    description: 'Go-to wide for dramatic foregrounds and compressed star trails. Absurdly sharp wide open for its focal range.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Sony FE 70-200mm f/2.8 GM OSS II',
    brand: 'Sony',
    category: 'lens',
    description: 'Brings distant ridgelines and wildlife into the frame. OSS is a genuine lifesaver at dusk when tripods aren\'t practical.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'Sigma 35mm f/1.4 DG DN Art',
    brand: 'Sigma',
    category: 'lens',
    description: 'My walk-around prime. Brilliant low-light performance and compact enough to not feel like a liability on long days.',
    featured: false,
  },

  // ── Tripod & Support ────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Gitzo GT2545T Traveler',
    brand: 'Gitzo',
    category: 'tripod',
    description: 'Carbon fibre, rock-solid on uneven terrain, and small enough to strap to the outside of a 30L pack. Worth every penny.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Joby GorillaPod 5K',
    brand: 'Joby',
    category: 'tripod',
    description: 'Wraps around branches, rocks, and tent poles. I bring it whenever the Gitzo stays home.',
    featured: false,
  },

  // ── Filters ─────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'NiSi V7 Filter System',
    brand: 'NiSi',
    category: 'filter',
    description: 'Polariser, 3-stop and 6-stop ND. The rotating polariser in the holder adapter is a small thing that saves big frustration.',
    featured: false,
  },

  // ── Audio ────────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'DJI Mic 2',
    brand: 'DJI',
    category: 'audio',
    description: 'Wireless clip mic for ambient narration and vlog-style field notes. 32-bit float recording means I can fix gain in post.',
    featured: false,
  },

  // ── Accessories ─────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Peak Design Capture Clip V3',
    brand: 'Peak Design',
    category: 'accessories',
    description: 'Camera stays on my shoulder strap, accessible in under a second. I won\'t hike without one.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'Anker 737 Power Bank',
    brand: 'Anker',
    category: 'accessories',
    description: '140W, 24,000mAh. Tops up the cameras, laptop, and headlamp on multi-day trips. Heavy but worth it for remote shoots.',
    featured: false,
  },

  // ── Pack & Carry ─────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Shimoda Explore 40',
    brand: 'Shimoda',
    category: 'pack',
    description: 'Camera cube in the bottom, backpacking kit on top. The best hybrid system I\'ve used — doesn\'t sacrifice one for the other.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Zpacks Arc Haul Ultra 60L',
    brand: 'Zpacks',
    category: 'pack',
    description: 'When I\'m going light and leaving the camera cube behind. Sub-600g for a 60L frame pack is still mind-bending to me.',
    featured: false,
  },

  // ── Shelter & Sleep ───────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Hilleberg Akto',
    brand: 'Hilleberg',
    category: 'shelter',
    description: 'One-person tunnel tent that laughs at alpine weather. Heavy for a solo tent, but I\'ve never regretted the margin it gives me.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Western Mountaineering UltraLite 20°F',
    brand: 'Western Mountaineering',
    category: 'shelter',
    description: 'Down sleeping bag I\'ve had for eight years. Still lofts perfectly. Best long-term investment in the kit.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'Therm-a-Rest NeoAir XTherm NXT',
    brand: 'Therm-a-Rest',
    category: 'shelter',
    description: 'R-value 7.3 in a pad that packs to the size of a water bottle. The crinkling noise at 2am is the only downside.',
    featured: false,
  },

  // ── Navigation ───────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Garmin inReach Mini 2',
    brand: 'Garmin',
    category: 'navigation',
    description: 'Two-way satellite communicator. Small enough that there\'s no excuse not to carry it. Non-negotiable for remote terrain.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Suunto 9 Baro Titanium',
    brand: 'Suunto',
    category: 'navigation',
    description: 'Barometric altimeter, multi-day battery, and a build quality that feels like it was designed for actual mountains.',
    featured: false,
  },

  // ── Clothing ─────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Arc\'teryx Alpha SV Jacket',
    brand: "Arc'teryx",
    category: 'clothing',
    description: 'The shell I reach for when conditions are serious. GORE-TEX Pro and the best pit zips in the business.',
    featured: true,
  },
  {
    _type: 'gear',
    name: 'Patagonia Nano Puff Hoody',
    brand: 'Patagonia',
    category: 'clothing',
    description: 'Synthetic insulation layers over everything and compresses to nothing. My most-used mid layer by far.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'Darn Tough Hiker Boot Sock',
    brand: 'Darn Tough',
    category: 'clothing',
    description: 'Lifetime guarantee merino. I stopped carrying backup socks once I switched to these.',
    featured: false,
  },

  // ── Food & Water ─────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Katadyn BeFree 1L',
    brand: 'Katadyn',
    category: 'nutrition',
    description: 'Hollow-fibre filter that screws onto a soft flask. Fast flow rate and weighs almost nothing.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'MSR PocketRocket Deluxe',
    brand: 'MSR',
    category: 'nutrition',
    description: 'Integrated igniter, simmer control, and a windscreen that actually works. Morning coffee is non-negotiable.',
    featured: false,
  },

  // ── Safety ───────────────────────────────────────────────────────────────────
  {
    _type: 'gear',
    name: 'Black Diamond Revolt 350',
    brand: 'Black Diamond',
    category: 'safety',
    description: 'Rechargeable headlamp with 350 lumens and a red night-vision mode. I carry a spare CR123 backup just in case.',
    featured: false,
  },
  {
    _type: 'gear',
    name: 'Adventure Medical Kits Ultralight .7',
    brand: 'Adventure Medical Kits',
    category: 'safety',
    description: 'Comprehensive first aid kit at 218g. Augmented with SAM splint and a tourniquet for technical terrain.',
    featured: false,
  },
]

async function seed() {
  console.log(`Inserting ${gear.length} gear items…`)
  const transaction = client.transaction()
  gear.forEach(item => transaction.create({ ...item, _id: `gear-${Math.random().toString(36).slice(2)}` }))
  const result = await transaction.commit()
  console.log(`Done — ${result.results.length} documents created.`)
}

seed().catch(err => { console.error(err); process.exit(1) })
