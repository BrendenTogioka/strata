import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
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
      structure: (S) =>
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
            // Curated homepage features — shows current home-page order at a glance
            S.listItem()
              .title('Featured (homepage order)')
              .icon(() => '★')
              .schemaType('trip')
              .child(
                S.documentList()
                  .title('Featured trips')
                  .schemaType('trip')
                  .filter('_type == "trip" && featured == true')
                  .defaultOrdering([{ field: 'featureOrder', direction: 'asc' }])
              ),
          ]),
    }),
    // Vision: GROQ query sandbox — remove in production if desired
    visionTool({ defaultApiVersion: '2024-01-01' }),
  ],

  schema: {
    types: schemaTypes,
  },
})
