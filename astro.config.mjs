// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  site: 'https://ourroamingreels.netlify.app',

  // Prefetch linked pages on hover — so trip pages are cached before the user
  // finishes clicking, making the iris transition land on a loaded page.
  prefetch: { defaultStrategy: 'hover' },

  // static: all pages pre-rendered at build time (Astro 6 default).
  // The /studio route uses prerender=false — it renders in dev and needs
  // a server adapter (Netlify/Vercel) in production.
  output: 'static',

  integrations: [react(), sitemap()],

  vite: {
    ssr: {
      // Sanity references browser globals at module evaluation time.
      // noExternal prevents Astro's SSR bundler from processing them.
      noExternal: ['sanity', '@sanity/vision'],
    },
  },
})
