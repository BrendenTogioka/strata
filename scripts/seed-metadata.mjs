/**
 * Patches existing Sanity trip documents with tripDate, category, and tags.
 *
 * Requires a write token:
 *   1. Go to sanity.io/manage → your project → API → Tokens → Add API token
 *   2. Name it "seed script", choose Editor role
 *   3. Add SANITY_WRITE_TOKEN=<token> to your .env file
 *
 * Run: node scripts/seed-metadata.mjs
 */

import { createClient } from '@sanity/client'
import { config } from 'dotenv'

config()

const client = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:   process.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token:     process.env.SANITY_WRITE_TOKEN,
  useCdn:    false,
})

const metadata = {
  'valley-of-fire': {
    tripDate: '2023-11-01',
    category: 'desert',
    tags:     ['photography', 'day-hike', 'golden-hour'],
  },
  'the-narrows': {
    tripDate: '2023-10-01',
    category: 'canyon',
    tags:     ['hiking', 'water', 'technical'],
  },
  'aurora-borealis': {
    tripDate: '2022-02-01',
    category: 'arctic',
    tags:     ['photography', 'night-sky', 'winter'],
  },
  'arctic-dawn': {
    tripDate: '2022-03-01',
    category: 'mountain',
    tags:     ['photography', 'winter', 'camping', 'remote'],
  },
  'havasupai-falls': {
    tripDate: '2024-04-01',
    category: 'canyon',
    tags:     ['backpacking', 'water', 'overnight'],
  },
  'jungle-falls': {
    tripDate: '2024-01-01',
    category: 'jungle',
    tags:     ['hiking', 'water', 'tropical'],
  },
}

const trips = await client.fetch('*[_type == "trip"] { _id, "slug": id.current }')

if (!trips.length) {
  console.log('No trips found. Make sure SANITY_WRITE_TOKEN and project ID are set correctly.')
  process.exit(1)
}

for (const trip of trips) {
  const meta = metadata[trip.slug]
  if (!meta) {
    console.log(`⚠  No metadata for "${trip.slug}" — skipping`)
    continue
  }
  await client.patch(trip._id).set(meta).commit()
  console.log(`✓  ${trip.slug} → ${meta.category} · [${meta.tags.join(', ')}] · ${meta.tripDate}`)
}

console.log('\nDone. Run npm run build to pick up the changes.')
