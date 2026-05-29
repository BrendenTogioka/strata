import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let projectId = process.env.PUBLIC_SANITY_PROJECT_ID
let dataset   = process.env.PUBLIC_SANITY_DATASET ?? 'production'
let token     = process.env.SANITY_WRITE_TOKEN
try {
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split('\n')) {
    const [k, v] = line.split('=')
    if (k?.trim() === 'PUBLIC_SANITY_PROJECT_ID' && !projectId) projectId = v?.trim()
    if (k?.trim() === 'SANITY_WRITE_TOKEN' && !token) token = v?.trim()
  }
} catch {}

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })
const slug = process.argv[2]
const doc = await client.fetch(`*[_type=="trip" && id.current==$slug][0]`, { slug })
if (!doc) { console.error('not found:', slug); process.exit(1) }

console.log('DOC _id:', doc._id)
console.log('pageTitle:', JSON.stringify(doc.pageTitle))
console.log('storyTitle:', doc.storyTitle)
console.log('heroImage asset:', doc.heroImage?.asset?._ref)
console.log('story blocks:', doc.story?.length)
console.log('─'.repeat(80))
doc.story?.forEach((b, i) => {
  let line = `[${i}] ${b.type}`
  if (b.type === 'dayEntry') line += ` (${b.eyebrowKind}) "${b.dayTitle ?? ''}"`
  if (b.type === 'text' || b.type === 'hindsight') {
    line += ` — ${(b.richText ?? []).length} paras`
    console.log(line)
    ;(b.richText ?? []).forEach((blk, j) => {
      const t = (blk.children ?? []).map(c => c.text).join('')
      console.log(`        p${j}: ${t.slice(0,100)}${t.length>100?'…':''}`)
    })
    return
  }
  if (b.type === 'quote' || b.type === 'callout') line += ` — "${(b.content ?? '').slice(0,90)}"`
  if (b.type === 'image') line += ` — asset:${b.image?.asset?._ref}  alt:"${(b.image?.alt ?? '').slice(0,45)}"  cap:"${(b.image?.caption ?? '').slice(0,45)}"`
  if (b.type === 'gallery') {
    line += ` (${b.layout}) — ${b.images?.length} imgs`
    console.log(line)
    b.images?.forEach((im, j) => console.log(`        g${j}: asset:${im.asset?._ref}  alt:"${(im.alt??'').slice(0,40)}"  cap:"${(im.caption??'').slice(0,40)}"`))
    return
  }
  console.log(line)
})
