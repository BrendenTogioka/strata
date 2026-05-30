import { defineField, defineType } from 'sanity'

// ── Category constants ─────────────────────────────────────────────────────
// Fine-grained sub-categories. The frontend groups them into Camera / Backpacking
// using CAMERA_CATS / BACKPACKING_CATS lookup tables in gear.astro.
const CATEGORIES = [
  // Camera group
  { title: 'Camera Body',          value: 'camera'      },
  { title: 'Lens',                 value: 'lens'        },
  { title: 'Tripod & Support',     value: 'tripod'      },
  { title: 'Filters & Glass',      value: 'filter'      },
  { title: 'Audio',                value: 'audio'       },
  { title: 'Camera Accessories',   value: 'accessories' },
  // Backpacking group
  { title: 'Pack & Carry',         value: 'pack'        },
  { title: 'Shelter',              value: 'shelter'     },
  { title: 'Sleep',                value: 'sleep'       },
  { title: 'Kitchen',              value: 'kitchen'     },
  { title: 'Navigation',           value: 'navigation'  },
  { title: 'Clothing & Footwear',  value: 'clothing'    },
  { title: 'Food & Water',         value: 'nutrition'   },
  { title: 'Electronics',          value: 'electronics' },
  { title: 'Safety & First Aid',   value: 'safety'      },
  { title: 'Misc',                 value: 'misc'        },
]

export default defineType({
  name: 'gear',
  title: 'Gear',
  type: 'document',

  fields: [
    defineField({
      name: 'name',
      title: 'Product name',
      type: 'string',
      description: 'e.g. "A7R V" or "ULA Circuit"',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string',
      description: 'e.g. "Sony" or "ULA"',
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list:   CATEGORIES,
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'weightOz',
      title: 'Weight (oz)',
      type: 'number',
      description: 'Single-unit weight in ounces. Shown on the card and summed into the page total (per filter).',
      validation: Rule => Rule.min(0),
    }),

    defineField({
      name: 'description',
      title: 'Personal note',
      type: 'text',
      rows: 3,
      description: '1–2 sentences: why you carry it, what makes it earn its weight.',
    }),

    defineField({
      name: 'image',
      title: 'Product image',
      type: 'image',
      description: 'Optional — can add later. Hotspot enabled.',
      options: { hotspot: true },
    }),

    defineField({
      name: 'showOnGearPage',
      title: 'Show on Gear page',
      type: 'boolean',
      description: 'Controls visibility on the public /gear page. Items auto-imported from a trip arrive turned OFF — flip this on to publish them. Items added by hand here default to ON.',
      initialValue: true,
    }),

    defineField({
      name: 'featured',
      title: 'Featured item',
      type: 'boolean',
      description: 'Pin this item to the top of its category group (only applies when shown on the Gear page).',
      initialValue: false,
    }),
  ],

  orderings: [
    {
      title: 'Category, then name',
      name:  'categoryName',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'name',     direction: 'asc' },
      ],
    },
  ],

  preview: {
    select: {
      title:    'name',
      subtitle: 'brand',
      weightOz: 'weightOz',
      show:     'showOnGearPage',
      media:    'image',
    },
    prepare({ title, subtitle, weightOz, show }: { title?: string; subtitle?: string; weightOz?: number; show?: boolean }) {
      const w = typeof weightOz === 'number' && weightOz > 0 ? ` · ${weightOz} oz` : ''
      const hidden = show === false ? ' · (hidden)' : ''
      return { title: title ?? 'Untitled', subtitle: `${subtitle ?? ''}${w}${hidden}` }
    },
  },
})
