/**
 * One-time migration: convert story "Paragraph" blocks from plain-text
 * `content` to Portable Text `richText` (the new rich-text editor field).
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=skXXX node scripts/migrate-story-richtext.mjs
 *   (the token is also read from .env if present)
 *
 * Get a write token from: https://sanity.io/manage → project → API → Tokens
 * (Editor permission). Safe + idempotent — only touches text blocks that
 * still have a string `content` and no `richText` yet.
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Env ──────────────────────────────────────────────────────────────────
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i === -1) continue
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    if (k === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v
    if (k === 'PUBLIC_SANITY_DATASET'   && !process.env.PUBLIC_SANITY_DATASET) dataset = v || dataset
    if (k === 'SANITY_WRITE_TOKEN'      && !token) token = v
  }
} catch {}

if (!projectId) { console.error('❌  Missing PUBLIC_SANITY_PROJECT_ID'); process.exit(1) }
if (!token)     { console.error('❌  Missing SANITY_WRITE_TOKEN'); process.exit(1) }

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

// Plain text → Portable Text: split on blank lines into paragraph blocks.
function toPortableText(text) {
  return text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => ({
      _type: 'block',
      _key: key(),
      style: 'normal',
      markDefs: [],
      children: [{ _type: 'span', _key: key(), text: p, marks: [] }],
    }))
}

// ── Run ────────────────────────────────────────────────────────────────────
const docs = await client.fetch('*[_type == "trip"]{ _id, story }')
console.log(`Found ${docs.length} trip document(s) (incl. drafts).\n`)

let patched = 0
for (const doc of docs) {
  if (!Array.isArray(doc.story)) continue
  let changed = false

  const story = doc.story.map(block => {
    if (
      block?.type === 'text' &&
      typeof block.content === 'string' &&
      !(Array.isArray(block.richText) && block.richText.length)
    ) {
      changed = true
      const { content, ...rest } = block
      return { ...rest, richText: toPortableText(content) }
    }
    return block
  })

  if (!changed) { console.log(`• ${doc._id} — no text blocks to migrate`); continue }

  await client.patch(doc._id).set({ story }).commit()
  patched++
  console.log(`✓ ${doc._id} — migrated`)
}

console.log(`\nDone. Patched ${patched} document(s).`)
