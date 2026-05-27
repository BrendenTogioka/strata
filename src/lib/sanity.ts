import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

export const client = createClient({
  projectId:  import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset:    import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',  // pin — never use 'latest'
  useCdn:     true,          // fine for static build-time fetches
})

const builder = imageUrlBuilder(client)

/**
 * Returns a Sanity image URL builder for the given source.
 * Usage: urlFor(image).width(1600).quality(85).format('webp').url()
 */
export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/**
 * Generates a srcset string for responsive Sanity images.
 * Usage: sanityImgSrcset(trip.heroImage, [800, 1200, 1600, 2400])
 */
export function sanityImgSrcset(
  source: SanityImageSource,
  widths: number[],
  quality = 85,
): string {
  return widths
    .map(w =>
      `${urlFor(source).width(w).quality(quality).format('webp').url()} ${w}w`,
    )
    .join(', ')
}
