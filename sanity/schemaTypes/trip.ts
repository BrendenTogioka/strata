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
      name: 'num',
      title: 'Entry number',
      type: 'string',
      description: 'Display number, e.g. "01"',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Controls order in the gallery (1 = first)',
      validation: Rule => Rule.required().integer().positive(),
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
      title: 'Date',
      type: 'string',
      description: 'Display date, e.g. "November 2023"',
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
      description: 'The trip narrative. Add text blocks and pull quotes.',
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
                  { title: 'Paragraph', value: 'text' },
                  { title: 'Pull quote', value: 'quote' },
                ],
                layout: 'radio',
              },
              validation: Rule => Rule.required(),
            }),
            defineField({
              name: 'content',
              title: 'Content',
              type: 'text',
              rows: 5,
              validation: Rule => Rule.required(),
            }),
          ],
          preview: {
            select: { type: 'type', content: 'content' },
            prepare({ type, content }: { type: string; content: string }) {
              const icon = type === 'quote' ? '❝' : '¶'
              return {
                title: `${icon} ${content?.substring(0, 60) ?? ''}…`,
              }
            },
          },
        },
      ],
    }),
  ],

  preview: {
    select: {
      title:  'cardTitle',
      num:    'num',
      media:  'heroImage',
    },
    prepare({ title, num, media }: { title: string; num: string; media: unknown }) {
      return {
        title:    `${num} — ${title}`,
        subtitle: 'Trip',
        media,
      }
    },
  },

  orderings: [
    {
      title: 'Sort order',
      name:  'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
  ],
})
