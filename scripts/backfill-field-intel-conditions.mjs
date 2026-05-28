/**
 * Backfill: add curated fieldIntel + conditions to every existing trip.
 *
 * Each trip gets a hand-tuned set of intel rows and condition items based on
 * its real-world location (Havasupai, Zion Narrows, etc.) — generic
 * category-based defaults would be too vague for the panel to be useful.
 *
 * Idempotent: by default skips trips that already have fieldIntel or
 * conditions. Pass --force to overwrite.
 *
 * Usage: node scripts/backfill-field-intel-conditions.mjs [--force]
 * (token + project read from .env or env vars)
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i === -1) continue
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim()
    if (k === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v
    if (k === 'PUBLIC_SANITY_DATASET'   && !process.env.PUBLIC_SANITY_DATASET) dataset = v || dataset
    if (k === 'SANITY_WRITE_TOKEN'      && !token) token = v
  }
} catch {}

if (!projectId || !token) { console.error('❌  Missing project id or write token'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

// ── Helpers ────────────────────────────────────────────────────────────────
const intel = (key, value, status = '') => ({ _key: randomUUID().slice(0, 12), key, value, status })
const cond  = (icon, label, value, subtext = '') => ({ _key: randomUUID().slice(0, 12), icon, label, value, subtext })

// ── Per-slug curated data ──────────────────────────────────────────────────
const DATA = {
  // ── Havasupai (full 4-day trip report) ────────────────────────────────
  'havasupai-trip-report-4-days-40-miles-turquoise-water-long-miles-and-one-late-night-climb': {
    fieldIntel: [
      intel('Permit',         'Required (tribal lottery)', 'warn'),
      intel('Reservation Window', 'Feb 1 — sells out same day', 'warn'),
      intel('Difficulty',     'Strenuous'),
      intel('Best Window',    'Mar–May / Sep–Oct',         'good'),
      intel('Water Source',   'Village tap + Havasu Creek','good'),
      intel('Cell Service',   'None below the rim',        'warn'),
      intel('Camping',        'Designated sites only'),
      intel('Hazards',        'Flash floods, late-night switchback exit', 'warn'),
      intel('Trailhead Access', 'Hualapai Hilltop, 4hr from Vegas'),
      intel('Fee',            '$455 / 3-night permit'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '78°F',     'avg daytime high'),
      cond('☀️', 'Sky',         'Clear',    'few afternoon clouds'),
      cond('🌊', 'Water Temp',  '70°F',     'turquoise & cold'),
      cond('💨', 'Wind',        '5–8 mph',  'calm in the canyon'),
    ],
  },

  // ── Havasupai (short featured version) ────────────────────────────────
  'havasupai-falls': {
    fieldIntel: [
      intel('Permit',       'Required (tribal lottery)', 'warn'),
      intel('Difficulty',   'Strenuous'),
      intel('Best Window',  'Mar–May / Sep–Oct',         'good'),
      intel('Water Source', 'Village tap + creek',       'good'),
      intel('Cell Service', 'None below the rim',        'warn'),
      intel('Camping',      'Designated sites'),
      intel('Hazards',      'Flash floods',              'warn'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '78°F',  'avg daytime high'),
      cond('☀️', 'Sky',         'Clear', 'sunny'),
      cond('🌊', 'Water Temp',  '70°F',  'aquamarine'),
      cond('💨', 'Wind',        'Calm'),
    ],
  },

  // ── Arctic Dawn (Alaska / Yukon, mountain, winter) ───────────────────
  'arctic-dawn': {
    fieldIntel: [
      intel('Permit',       'Backcountry registration'),
      intel('Difficulty',   'Strenuous (winter)',        'warn'),
      intel('Best Window',  'Mar–Apr',                   'good'),
      intel('Water Source', 'Snow melt — fuel required', 'warn'),
      intel('Cell Service', 'None',                      'warn'),
      intel('Crowds',       'Solitude',                  'good'),
      intel('Hazards',      'Hypothermia, white-out, frostbite', 'warn'),
      intel('Navigation',   'GPS + paper map (compass declination 22°E)'),
    ],
    conditions: [
      cond('🌡',  'Temperature', '-22°F',     'avg overnight low'),
      cond('☀️',  'Sky',         'Clear',     'high pressure'),
      cond('💨',  'Wind',        '10–15 mph', 'wind chill -45°F'),
      cond('🏔', 'Visibility',  'Unlimited', '50+ miles'),
    ],
  },

  // ── Aurora Borealis (Northern Europe, arctic) ────────────────────────
  'aurora-borealis': {
    fieldIntel: [
      intel('Permit',       'None'),
      intel('Difficulty',   'Moderate (cold-weather camping)'),
      intel('Best Window',  'Sep–Mar',                  'good'),
      intel('Cell Service', 'Spotty'),
      intel('Crowds',       'Low',                       'good'),
      intel('Vehicle',      '4WD recommended Nov–Mar'),
      intel('Hazards',      'Sub-zero temps, road ice',  'warn'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '-25°F',   'overnight'),
      cond('☀️', 'Sky',         'Clear',   'critical for aurora'),
      cond('🌙', 'Moon Phase',  'New',     'darker sky = stronger aurora'),
      cond('🌅', 'Sun Hours',   '3 hr',    'mostly polar twilight'),
    ],
  },

  // ── Jungle Falls (SE Asia, jungle) ────────────────────────────────────
  'jungle-falls': {
    fieldIntel: [
      intel('Permit',       'National park entry fee'),
      intel('Difficulty',   'Moderate'),
      intel('Best Window',  'Dec–Feb (dry season)',     'good'),
      intel('Water Source', 'Streams (filter required)'),
      intel('Cell Service', 'None on trail',             'warn'),
      intel('Crowds',       'Few hikers',                'good'),
      intel('Hazards',      'Leeches, slick rock, snakes', 'warn'),
      intel('Wildlife',     'Hornbills, gibbons, macaques'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '78°F',    'cool for the region'),
      cond('☁️', 'Sky',         'Overcast', 'permanent canopy shade'),
      cond('🌧', 'Humidity',    '90%'),
      cond('🌲', 'Trail Surface','Slick',  'wet roots, moss-covered rock'),
    ],
  },

  // ── The Narrows (Zion, Utah) ──────────────────────────────────────────
  'the-narrows': {
    fieldIntel: [
      intel('Permit',       'None (bottom-up); top-down lottery'),
      intel('Difficulty',   'Moderate–Strenuous'),
      intel('Best Window',  'Jun–Sep',                   'good'),
      intel('Water Source', 'Virgin River (filter)'),
      intel('Cell Service', 'None in the canyon',        'warn'),
      intel('Crowds',       'Heavy summer weekends',     'warn'),
      intel('Hazards',      'Flash floods, hypothermia', 'warn'),
      intel('River Flow',   'Closes above 150 cfs'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '68°F',    'cool in the canyon'),
      cond('☀️', 'Sky',         'Sunny',   'high overhead at noon'),
      cond('🌊', 'Water Temp',  '55°F',    'numbing after an hour'),
      cond('💨', 'River Flow',  '42 cfs',  'comfortable wading'),
    ],
  },

  // ── Valley of Fire (Nevada, desert) ───────────────────────────────────
  'valley-of-fire': {
    fieldIntel: [
      intel('Permit',       'State park entry ($15)'),
      intel('Difficulty',   'Easy–Moderate',             'good'),
      intel('Best Window',  'Oct–Apr',                   'good'),
      intel('Water Source', 'None on trail — carry 3L', 'warn'),
      intel('Cell Service', 'Spotty'),
      intel('Crowds',       'Moderate weekends'),
      intel('Hazards',      'Summer heat (110°F+), no shade', 'warn'),
      intel('Camping',      'Atlatl Rock / Arch Rock CG'),
    ],
    conditions: [
      cond('🌡', 'Temperature', '74°F',    'avg daytime high'),
      cond('☀️', 'Sky',         'Clear',   'sandstone glows at golden hour'),
      cond('💨', 'Wind',        '5 mph',   'calm'),
      cond('🌅', 'Sun Hours',   '10 hr',   'plan around 4–6 PM light'),
    ],
  },
}

// ── Run ────────────────────────────────────────────────────────────────────
const trips = await client.fetch(
  '*[_type == "trip"]{ _id, "slug": id.current, fieldIntel, conditions }',
)
console.log(`Found ${trips.length} trip(s).\n`)

let patched = 0, skipped = 0, missing = []
for (const trip of trips) {
  const data = DATA[trip.slug]
  if (!data) { missing.push(trip.slug); continue }

  const hasIntel = Array.isArray(trip.fieldIntel) && trip.fieldIntel.length > 0
  const hasCond  = Array.isArray(trip.conditions) && trip.conditions.length > 0
  if (!force && (hasIntel || hasCond)) {
    console.log(`↷ ${trip.slug} — already populated (use --force to overwrite)`)
    skipped++
    continue
  }

  await client.patch(trip._id).set({
    fieldIntel: data.fieldIntel,
    conditions: data.conditions,
  }).commit()
  patched++
  console.log(`✓ ${trip.slug} — patched ${data.fieldIntel.length} intel rows + ${data.conditions.length} conditions`)
}

console.log(`\nDone. Patched ${patched}, skipped ${skipped}.`)
if (missing.length) {
  console.log(`\n⚠  No curated data for: ${missing.join(', ')}`)
  console.log('   Add an entry to DATA{} in the script and re-run.')
}
