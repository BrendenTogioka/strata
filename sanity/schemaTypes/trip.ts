import { defineField, defineType } from 'sanity'
import { orderRankField } from '@sanity/orderable-document-list'
import { UppercaseInput } from '../components/UppercaseInput'
import { createPresetInput } from '../components/PresetInput'
import { CoordsLookupInput } from '../components/CoordsLookupInput'

// Curated preset lists — fieldIntel keys, conditions labels, conditions icons.
// Editors get autocomplete suggestions but can still type custom values.
const FIELD_INTEL_PRESETS = [
  'Permit',
  'Difficulty',
  'Best Window',
  'Water Source',
  'Cell Service',
  'Crowds',
  'Trailhead Access',
  'Camping',
  'Wildlife',
  'Hazards',
  'Fee',
  'Reservations',
  'Reservation Window',
  'Resupply',
  'Bears',
  'River Crossings',
  'Navigation',
  'Bailout Options',
  'Insurance',
  'Vehicle',
]

const CONDITION_LABEL_PRESETS = [
  'Temperature',
  'Sky',
  'Wind',
  'Humidity',
  'Water Temp',
  'Visibility',
  'Snowpack',
  'Tide',
  'Sun Hours',
  'Moon Phase',
  'Air Quality',
  'River Flow',
  'Trail Surface',
  'Wildfire Risk',
]

const CONDITION_ICON_PRESETS = [
  '🌡', '☀️', '⛅', '☁️', '🌧', '⛈', '❄️', '🌫', '💨', '🌊', '🌅', '🌙',
  '🔥', '🏔', '🌲', '🌵',
]

const FieldIntelKeyInput     = createPresetInput(FIELD_INTEL_PRESETS)
const ConditionLabelInput    = createPresetInput(CONDITION_LABEL_PRESETS)
const ConditionIconInput     = createPresetInput(CONDITION_ICON_PRESETS)

export default defineType({
  name: 'trip',
  title: 'Trip',
  type: 'document',

  fields: [
    // Hidden rank used by the orderable Featured list (drag to reorder)
    orderRankField({ type: 'trip' }),

    // ── Titles ──────────────────────────────────────────────────────────
    // Story title first (the descriptive headline editors actually craft per
    // post), then the stylised page-title lines used by the hero + slug.
    defineField({
      name: 'storyTitle',
      title: 'Trip title',
      type: 'string',
      description: 'The italic headline shown under the stats bar, directly above the story copy. Used as the OG/social headline.',
    }),

    defineField({
      name: 'pageTitle',
      title: 'Page title lines',
      type: 'array',
      of: [{
        type: 'string',
        components: { input: UppercaseInput },
      }],
      description: 'The big hero title, one line per entry, e.g. ["VALLEY", "OF FIRE"]. Auto-uppercases. Drives the <title> tag, URL slug, and gallery card title — keep it short and location-driven for SEO.',
      validation: Rule => Rule.required().min(1).max(3),
    }),

    // ── Identity ────────────────────────────────────────────────────────
    defineField({
      name: 'id',
      title: 'URL slug',
      type: 'slug',
      description: 'Used in the URL: /expedition/[slug]. Auto-generated from the page title lines.',
      options: {
        source: (doc: { pageTitle?: string[] }) =>
          Array.isArray(doc.pageTitle) ? doc.pageTitle.join(' ') : '',
        slugify: (input: string) =>
          input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'tripDate',
      title: 'Trip date',
      type: 'date',
      description: 'Used for gallery ordering (newest first) and the expeditions archive.',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'description',
      title: 'Short description',
      type: 'text',
      rows: 3,
      description: 'One or two sentences. Shown on the expeditions archive cards and used as the page’s search/social description. Max 140 characters so it stays fully visible.',
      validation: Rule => Rule.required().max(140),
    }),

    // ── Location & stats ────────────────────────────────────────────────
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Display location, e.g. "Nevada, USA"',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'coords',
      title: 'GPS coordinates',
      type: 'string',
      description: 'Fill Location above first, then click Lookup to auto-generate. Or type manually, e.g. "36°26′N 114°31′W".',
      components: { input: CoordsLookupInput },
    }),

    defineField({
      name: 'date',
      title: 'Display date',
      type: 'string',
      description: 'Shown on the trip page, e.g. "November 2023"',
    }),

    defineField({
      name: 'distance',
      title: 'Distance',
      type: 'string',
      description: 'e.g. "8.2 mi" — use "—" for N/A',
    }),

    defineField({
      name: 'elevation',
      title: 'Elevation change',
      type: 'string',
      description: 'e.g. "±1,200 ft" — use "—" for N/A',
    }),

    defineField({
      name: 'duration',
      title: 'Duration',
      type: 'string',
      description: 'e.g. "2 days" or "5 nights"',
    }),

    defineField({
      name: 'routeGpx',
      title: 'Route GPX file',
      type: 'file',
      description: 'Upload a .gpx from AllTrails, Strava, or Garmin. Elevation profile is auto-derived at build time.',
      options: { accept: '.gpx,application/gpx+xml' },
    }),

    defineField({
      name: 'elevationPoints',
      title: 'Elevation profile (manual fallback)',
      type: 'array',
      of: [{ type: 'number' }],
      description: 'Auto-derived from GPX when present. Override here for trips without GPS data. Values in feet, 10–20 points.',
    }),

    // ── Field Intelligence & Conditions ────────────────────────────────────
    defineField({
      name: 'fieldIntel',
      title: 'Field Intelligence',
      type: 'array',
      description: 'Key-value rows shown in the Field Intelligence panel (permit status, difficulty, water source, etc.).',
      of: [{
        type: 'object',
        name: 'intelRow',
        title: 'Row',
        fields: [
          defineField({
            name: 'key',
            title: 'Label',
            type: 'string',
            description: 'Pick a recommended label or type a custom one. Consistent labels across trips make the panel easier to scan.',
            components: { input: FieldIntelKeyInput },
            validation: Rule => Rule.required(),
          }),
          defineField({ name: 'value', title: 'Value', type: 'string', validation: Rule => Rule.required() }),
          defineField({
            name: 'status',
            title: 'Status colour',
            type: 'string',
            description: 'Optional colour applied to the value',
            options: {
              list: [
                { title: 'Neutral',         value: ''     },
                { title: 'Good (green)',     value: 'good' },
                { title: 'Warning (orange)', value: 'warn' },
              ],
              layout: 'radio',
            },
            initialValue: '',
          }),
        ],
        preview: {
          select: { key: 'key', value: 'value', status: 'status' },
          prepare({ key, value, status }: { key: string; value: string; status: string }) {
            const dot = status === 'good' ? '● ' : status === 'warn' ? '⚠ ' : '· '
            return { title: `${dot}${key}: ${value}` }
          },
        },
      }],
    }),

    defineField({
      name: 'conditions',
      title: 'Conditions at time of visit',
      type: 'array',
      description: 'Items in the conditions strip shown below the intro (temperature, weather, snowpack, etc.).',
      of: [{
        type: 'object',
        name: 'conditionItem',
        title: 'Condition',
        fields: [
          defineField({
            name: 'icon',
            title: 'Icon (emoji)',
            type: 'string',
            description: 'Pick a suggested emoji or paste your own.',
            components: { input: ConditionIconInput },
          }),
          defineField({
            name: 'label',
            title: 'Label',
            type: 'string',
            description: 'Pick a recommended label or type a custom one (e.g. Temperature).',
            components: { input: ConditionLabelInput },
            validation: Rule => Rule.required(),
          }),
          defineField({ name: 'value',   title: 'Value',        type: 'string', description: 'e.g. -25C',        validation: Rule => Rule.required() }),
          defineField({ name: 'subtext', title: 'Sub-label',    type: 'string', description: 'e.g. avg daytime low' }),
        ],
        preview: {
          select: { label: 'label', value: 'value', icon: 'icon' },
          prepare({ label, value, icon }: { label: string; value: string; icon: string }) {
            return { title: `${icon ?? ''} ${label}: ${value}`.trim() }
          },
        },
      }],
    }),

    // ── Classification ──────────────────────────────────────────────────
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Primary environment type',
      options: {
        list: [
          { title: 'Desert',   value: 'desert'   },
          { title: 'Canyon',   value: 'canyon'   },
          { title: 'Arctic',   value: 'arctic'   },
          { title: 'Mountain', value: 'mountain' },
          { title: 'Jungle',   value: 'jungle'   },
          { title: 'Coastal',  value: 'coastal'  },
          { title: 'Forest',   value: 'forest'   },
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Select all that apply',
      options: {
        list: [
          { title: 'Photography',  value: 'photography'  },
          { title: 'Hiking',       value: 'hiking'       },
          { title: 'Backpacking',  value: 'backpacking'  },
          { title: 'Camping',      value: 'camping'      },
          { title: 'Day Hike',     value: 'day-hike'     },
          { title: 'Overnight',    value: 'overnight'    },
          { title: 'Winter',       value: 'winter'       },
          { title: 'Water',        value: 'water'        },
          { title: 'Night Sky',    value: 'night-sky'    },
          { title: 'Golden Hour',  value: 'golden-hour'  },
          { title: 'Technical',    value: 'technical'    },
          { title: 'Remote',       value: 'remote'       },
          { title: 'Tropical',     value: 'tropical'     },
          { title: 'Swimming',     value: 'swimming'     },
          { title: 'Solo',         value: 'solo'         },
        ],
      },
    }),

    // ── Visual ──────────────────────────────────────────────────────────
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      description: 'Main photo used in the gallery card and trip page hero.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description: 'Describe the image for screen readers',
        }),
      ],
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'accentColor',
      title: 'Accent colour',
      type: 'string',
      description: 'Optional override (hex, e.g. "#C04820"). Leave blank to auto-use the main colour pulled from the hero image. Tints the second title line, links and the colour-block feature.',
      validation: Rule =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, {
          name: 'hex colour',
          invert: false,
        }).warning('Should be a valid hex colour like #C04820'),
    }),

    defineField({
      name: 'cardVideo',
      title: 'Card video clip',
      type: 'cloudinary.asset',
      description: 'Short 10–20s ambient clip shown on mobile expedition cards. Upload via the Cloudinary browser.',
    }),

    // ── Homepage feature ──────────────────────────────────────────────────
    defineField({
      name: 'featured',
      title: 'Feature on homepage',
      type: 'boolean',
      description: 'Show this trip as a large cinematic section on the home page (below the recent-trips scroll).',
      initialValue: false,
    }),

    defineField({
      name: 'featureLayout',
      title: 'Feature layout',
      type: 'string',
      options: {
        list: [
          { title: 'Text right',   value: 'text-right'  },
          { title: 'Text left',    value: 'text-left'   },
          { title: 'Text + quote', value: 'color-quote' },
        ],
        layout: 'radio',
      },
      hidden: ({ parent }: { parent?: { featured?: boolean } }) => !parent?.featured,
      validation: Rule => Rule.custom((val, ctx) => {
        const featured = (ctx.parent as { featured?: boolean } | undefined)?.featured
        if (featured && !val) return 'Pick a layout for the homepage feature'
        return true
      }),
    }),

    defineField({
      name: 'featureBlurb',
      title: 'Feature copy',
      type: 'text',
      rows: 3,
      description: 'The paragraph shown in the homepage feature. Leave empty to reuse the short description above.',
      hidden: ({ parent }: { parent?: { featured?: boolean } }) => !parent?.featured,
    }),

    defineField({
      name: 'featureQuote',
      title: 'Feature pull quote',
      type: 'text',
      rows: 2,
      description: 'Shown only with the “Text + quote on colour” layout.',
      hidden: ({ parent }: { parent?: { featured?: boolean; featureLayout?: string } }) =>
        !parent?.featured || parent?.featureLayout !== 'color-quote',
    }),

    // Order on the homepage is now controlled by drag-and-drop in the
    // "Featured (drag to reorder)" sidebar item — see sanity.config.ts.

    // ── Story ───────────────────────────────────────────────────────────
    defineField({
      name: 'story',
      title: 'Story',
      type: 'array',
      description: 'The trip narrative. Mix paragraphs, quotes, images, galleries, videos, callouts, and dividers.',
      of: [
        {
          type: 'object',
          name: 'storyBlock',
          title: 'Story block',
          fields: [
            defineField({
              name: 'type',
              title: 'Block type',
              type: 'string',
              options: {
                list: [
                  { title: 'Paragraph',  value: 'text'      },
                  { title: 'Pull quote', value: 'quote'     },
                  { title: 'Callout',    value: 'callout'   },
                  { title: 'Image',      value: 'image'     },
                  { title: 'Gallery',    value: 'gallery'   },
                  { title: 'Video',      value: 'video'     },
                  { title: 'Divider',    value: 'divider'   },
                  { title: 'Section',    value: 'dayEntry'  },
                  { title: 'Hindsight',  value: 'hindsight' },
                ],
                layout: 'radio',
              },
              validation: Rule => Rule.required(),
            }),

            // ── Section block ────────────────────────────────────────────
            // Eyebrow label can be one of four kinds:
            //   • Overview        — first section, "Overview" eyebrow
            //   • Day             — auto-numbered "Day 01", "Day 02" …
            //                       (numbers count up across day-kind sections)
            //   • Final Thoughts  — closing section, "Final Thoughts" eyebrow
            //   • Custom          — author-supplied eyebrow text
            // Backwards-compat: existing entries default to Day mode.
            defineField({
              name: 'eyebrowKind',
              title: 'Section label',
              type: 'string',
              description: 'Pick a recommended label or use Custom to write your own.',
              options: {
                list: [
                  { title: 'Overview',                value: 'overview' },
                  { title: 'Day (auto-numbered)',     value: 'day'      },
                  { title: 'Final Thoughts',          value: 'final'    },
                  { title: 'Custom label',            value: 'custom'   },
                ],
                layout: 'radio',
              },
              initialValue: 'day',
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'dayEntry',
            }),
            defineField({
              name: 'customEyebrow',
              title: 'Custom label',
              type: 'string',
              description: 'Small text shown above the heading, e.g. "Aftermath", "Field Notes".',
              hidden: ({ parent }: { parent?: { type?: string; eyebrowKind?: string } }) =>
                parent?.type !== 'dayEntry' || parent?.eyebrowKind !== 'custom',
              validation: Rule => Rule.custom((val, ctx) => {
                const parent = ctx.parent as { type?: string; eyebrowKind?: string } | undefined
                if (parent?.type === 'dayEntry' && parent?.eyebrowKind === 'custom' && !val) return 'Required'
                return true
              }),
            }),
            defineField({
              name: 'dayTitle',
              title: 'Section title',
              type: 'string',
              description: 'The big heading for this section, e.g. "The Approach" or "Summit Ridge".',
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'dayEntry',
              validation: Rule => Rule.custom((val, ctx) => {
                const type = (ctx.parent as { type?: string } | undefined)?.type
                if (type === 'dayEntry' && !val) return 'Required'
                return true
              }),
            }),

            // Rich text — paragraph blocks (Portable Text)
            defineField({
              name: 'richText',
              title: 'Text',
              type: 'array',
              hidden: ({ parent }: { parent?: { type?: string } }) => !['text', 'hindsight'].includes(parent?.type ?? ''),
              validation: Rule => Rule.custom((val, ctx) => {
                const type = (ctx.parent as { type?: string } | undefined)?.type
                if (['text', 'hindsight'].includes(type ?? '') && (!val || (Array.isArray(val) && val.length === 0))) return 'Required'
                return true
              }),
              of: [
                {
                  type: 'block',
                  // Heading options — H1 is reserved for the trip hero title
                  styles: [
                    { title: 'Normal', value: 'normal' },
                    { title: 'H2',     value: 'h2'      },
                    { title: 'H3',     value: 'h3'      },
                    { title: 'Quote',  value: 'blockquote' },
                  ],
                  lists: [
                    { title: 'Bullet',   value: 'bullet' },
                    { title: 'Numbered', value: 'number' },
                  ],
                  marks: {
                    decorators: [
                      { title: 'Bold',          value: 'strong'         },
                      { title: 'Italic',        value: 'em'             },
                      { title: 'Underline',     value: 'underline'      },
                      { title: 'Strike',        value: 'strike-through' },
                      { title: 'Code',          value: 'code'           },
                    ],
                    annotations: [
                      {
                        name: 'link',
                        type: 'object',
                        title: 'Link',
                        fields: [
                          { name: 'href', type: 'url', title: 'URL' },
                        ],
                      },
                    ],
                  },
                },
              ],
            }),

            // Plain text content — pull quote, callout
            defineField({
              name: 'content',
              title: 'Content',
              type: 'text',
              rows: 4,
              description: 'For Callout, use short field-note style: "Day 3 · Summit Ridge · −18°C"',
              hidden: ({ parent }: { parent?: { type?: string } }) =>
                !['quote', 'callout'].includes(parent?.type ?? ''),
              validation: Rule => Rule.custom((val, ctx) => {
                const type = (ctx.parent as { type?: string } | undefined)?.type
                if (['quote', 'callout'].includes(type ?? '') && !val) return 'Required'
                return true
              }),
            }),

            // Single image
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'image',
              fields: [
                defineField({ name: 'alt',     title: 'Alt text', type: 'string' }),
                defineField({ name: 'caption', title: 'Caption',  type: 'string' }),
              ],
            }),

            // Gallery — 2–4 images shown in a grid row or full-bleed strip
            defineField({
              name: 'images',
              title: 'Images',
              type: 'array',
              description: '2–4 images for grid; 3 images recommended for strip',
              of: [{
                type: 'image',
                options: { hotspot: true },
                fields: [
                  defineField({ name: 'alt',     title: 'Alt text', type: 'string' }),
                  defineField({ name: 'caption', title: 'Caption',  type: 'string' }),
                ],
              }],
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'gallery',
            }),

            defineField({
              name: 'layout',
              title: 'Gallery layout',
              type: 'string',
              options: {
                list: [
                  { title: 'Grid (default)',             value: 'grid'  },
                  { title: 'Strip (full-width, 3-up)',   value: 'strip' },
                ],
                layout: 'radio',
              },
              initialValue: 'grid',
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'gallery',
            }),

            // Video — YouTube or Vimeo URL
            defineField({
              name: 'url',
              title: 'Video URL',
              type: 'url',
              description: 'YouTube or Vimeo URL',
              hidden: ({ parent }: { parent?: { type?: string } }) => parent?.type !== 'video',
            }),
          ],

          preview: {
            select: {
              type:          'type',
              content:       'content',
              richText:      'richText',
              media:         'image',
              dayTitle:      'dayTitle',
              eyebrowKind:   'eyebrowKind',
              customEyebrow: 'customEyebrow',
            },
            prepare({ type, content, richText, media, dayTitle, eyebrowKind, customEyebrow }: {
              type: string; content: string; richText?: any[]; media: unknown;
              dayTitle?: string; eyebrowKind?: string; customEyebrow?: string;
            }) {
              const labels: Record<string, string> = {
                text: '¶', quote: '❝', callout: '◆', image: '🖼', gallery: '▦', video: '▶', divider: '—',
                dayEntry: '▷', hindsight: '↺',
              }
              if (type === 'image')    return { title: '🖼 Image', media }
              if (type === 'gallery')  return { title: '▦ Gallery' }
              if (type === 'video')    return { title: '▶ Video' }
              if (type === 'divider')  return { title: '— Divider' }
              if (type === 'dayEntry') {
                const eyebrow =
                  eyebrowKind === 'overview' ? 'Overview' :
                  eyebrowKind === 'final'    ? 'Final Thoughts' :
                  eyebrowKind === 'custom'   ? (customEyebrow ?? 'Section') :
                                               'Day'
                return { title: `▷ ${eyebrow} · ${dayTitle ?? '—'}` }
              }
              if (type === 'hindsight') return { title: `↺ What We'd Do Differently` }
              const fromRichText = richText
                ?.find(b => b._type === 'block')
                ?.children?.map((c: any) => c.text).join('') ?? ''
              const text = type === 'text' ? fromRichText : (content ?? '')
              const icon = labels[type] ?? '·'
              return { title: `${icon} ${text.substring(0, 60)}…` }
            },
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      pageTitle:     'pageTitle',
      tripDate:      'tripDate',
      featured:      'featured',
      featureLayout: 'featureLayout',
      media:         'heroImage',
    },
    prepare({ pageTitle, tripDate, featured, featureLayout, media }: {
      pageTitle?: string[]; tripDate: string;
      featured?: boolean; featureLayout?: string;
      media: unknown;
    }) {
      const year = tripDate ? new Date(tripDate).getFullYear() : '—'
      const tag  = featured ? `★ featured · ${featureLayout ?? '—'}` : ''
      return {
        title:    Array.isArray(pageTitle) ? pageTitle.join(' ') : '—',
        subtitle: tag ? `${year} · ${tag}` : String(year),
        media,
      }
    },
  },

  orderings: [
    {
      title: 'Newest first',
      name:  'tripDateDesc',
      by: [{ field: 'tripDate', direction: 'desc' }],
    },
    {
      title: 'Oldest first',
      name:  'tripDateAsc',
      by: [{ field: 'tripDate', direction: 'asc' }],
    },
  ],
})
