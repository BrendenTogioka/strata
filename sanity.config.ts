import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'
import { cloudinarySchemaPlugin } from 'sanity-plugin-cloudinary'
import { schemaTypes } from './sanity/schemaTypes'

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID
const dataset   = import.meta.env.PUBLIC_SANITY_DATASET ?? 'production'

export default defineConfig({
  name:    'strata-studio',
  title:   'Strata Journal',

  projectId,
  dataset,
  basePath: '/studio',

  plugins: [
    structureTool({
      structure: (S, context) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Trips')
              .schemaType('trip')
              .child(
                S.documentList()
                  .title('All trips')
                  .schemaType('trip')
                  .filter('_type == "trip"')
                  .defaultOrdering([{ field: 'tripDate', direction: 'desc' }])
              ),
            // Drag-to-reorder featured trips — order shown here is the live home-page order
            orderableDocumentListDeskItem({
              type:    'trip',
              title:   'Featured (drag to reorder)',
              filter:  'featured == true',
              S,
              context,
            }),
            S.divider(),
            S.listItem()
              .title('Gear')
              .schemaType('gear')
              .child(
                S.documentList()
                  .title('All gear')
                  .schemaType('gear')
                  .filter('_type == "gear"')
                  .defaultOrdering([
                    { field: 'category', direction: 'asc' },
                    { field: 'name',     direction: 'asc' },
                  ])
              ),
          ]),
    }),
    // Vision: GROQ query sandbox — remove in production if desired
    visionTool({ defaultApiVersion: '2024-01-01' }),
    // Cloudinary media browser — requires SANITY_STUDIO_CLOUDINARY_CLOUD_NAME in .env
    cloudinarySchemaPlugin(),
  ],

  schema: {
    types: schemaTypes,
  },
})
