/**
 * Entry point for Sanity Studio.
 * Loaded as a module script from /studio.astro.
 * Mounts the Studio React SPA into #root.
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Studio } from 'sanity'
import config from '../../sanity.config'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(createElement(Studio, { config }))
}
