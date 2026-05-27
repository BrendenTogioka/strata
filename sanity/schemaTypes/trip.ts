import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'trip',
  title: 'Trip',
  type: 'document',

  fields: [
    // ── Identity ────────────────────────────────────────────────────────
    defineField({
      name: 'id',
      title: 'URL slug',
      type: 'slug',
      description: 'Used in the URL: /expedition/[slug]. Auto-generated from the card title.',
      options: {
        source: 'cardTitle',
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

    // ── Titles ──────────────────────────────────────────────────────────
    defineField({
      name: 'cardTitle',
      title: 'Card title',
      type: 'string',
      description: 'Title shown on the gallery card. Use \\n for a line break.',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'pageTitle',
      title: 'Page title lines',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Two lines of the hero title, e.g. ["VALLEY", "OF FIRE"]',
      validation: Rule => Rule.required().min(1).max(3),
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
      description: 'e.g. "36°26′N 114°31′W"',
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
      description: 'CSS hex value, e.g. "#C04820". Used for the second title line.',
      validation: Rule =>
        Rule.regex(/^#[0-9A-Fa-f]{6}$/, {
          name: 'hex colour',
          invert: false,
        }).warning('Should be a valid hex colour like #C04820'),
    }),

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
                  { title: 'Paragraph',  value: 'text'     },
                  { title: 'Pull quote', value: 'quote'    },
                  { title: 'Callout',    value: 'callout'  },
                  { title: 'Image',      value: 'image'    },
                  { title: 'Gallery',    value: 'gallery'  },
                  { title: 'Video',      value: 'video'    },
                  { title: 'Divider',    value: 'divider'  },
                ],
                layout: 'radio',
              },
              validation: Rule => Rule.required(),
            }),

            // Text content — paragraph, pull quote, callout
            defineField({
              name: 'content',
              title: 'Content',
              type: 'text',
              rows: 4,
              description: 'For Callout, use short field-note style: "Day 3 · Summit Ridge · −18°C"',
              hidden: ({ parent }: { parent?: { type?: string } }) =>
                !['text', 'quote', 'callout'].includes(parent?.type ?? ''),
              validation: Rule => Rule.custom((val, ctx) => {
                const type = (ctx.parent as { type?: string } | undefined)?.type
                if (['text', 'quote', 'callout'].includes(type ?? '') && !val) return 'Required'
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

            // Gallery — 2–4 images shown in a grid row
            defineField({
              name: 'images',
              title: 'Images',
              type: 'array',
              description: '2–4 images render as a grid row',
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
            select: { type: 'type', content: 'content', media: 'image' },
            prepare({ type, content, media }: { type: string; content: string; media: unknown }) {
              const labels: Record<string, string> = {
                text: '¶', quote: '❝', callout: '◆', image: '🖼', gallery: '▦', video: '▶', divider: '—',
              }
              if (type === 'image')   return { title: '🖼 Image', media }
              if (type === 'gallery') return { title: '▦ Gallery' }
              if (type === 'video')   return { title: '▶ Video' }
              if (type === 'divider') return { title: '— Divider' }
              const icon = labels[type] ?? '·'
              return { title: `${icon} ${content?.substring(0, 60) ?? ''}…` }
            },
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title:    'cardTitle',
      tripDate: 'tripDate',
      media:    'heroImage',
    },
    prepare({ title, tripDate, media }: { title: string; tripDate: string; media: unknown }) {
      const year = tripDate ? new Date(tripDate).getFullYear() : '—'
      return {
        title:    title,
        subtitle: String(year),
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
