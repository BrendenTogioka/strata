import { gsap } from 'gsap'
import { navigate } from 'astro:transitions/client'
import { bypassViewTransition, preloadImage } from './viewTransition'

interface IrisOptions {
  src:      string
  rect:     DOMRect
  href:     string
  heroSrc?: string  // full-res destination hero — preloaded during the animation
}

/**
 * Iris expand transition.
 * 1. Animates the card image rect to fullscreen (visual feedback).
 * 2. Calls Astro's navigate() — a client-side swap, not a hard reload.
 *    The overlay is appended to <html> (not <body>) so it survives Astro's
 *    body swap — swapBodyElement only preserves [data-astro-transition-persist]
 *    elements inside <body> and discards everything else. By living a level up,
 *    the overlay stays on screen across the swap until the destination's
 *    initPageAnimations fades it out once .trip-hero-img has decoded. That
 *    handoff is what prevents the dark flash between navigations.
 */
export function playIrisTransition({ src, rect, href, heroSrc }: IrisOptions): void {
  // Re-entry guard: pointer-events:none on the overlay means clicks pass
  // through to the card beneath, so a double-click would otherwise stack two
  // overlays and leak one onto the destination page. Bail if one is already
  // animating — the first click wins.
  if (document.querySelector('.iris-overlay')) return

  // Reduced motion: skip the expand animation, just navigate.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    navigate(href)
    return
  }
  // Kick off a preload for the destination's full-res hero immediately —
  // the 0.75s animation gives the browser a head start before the page swap.
  preloadImage(heroSrc)
  // Container starts at the card image's exact screen position
  const container = document.createElement('div')
  container.className = 'iris-overlay'
  Object.assign(container.style, {
    position:      'fixed',
    top:           `${rect.top}px`,
    left:          `${rect.left}px`,
    width:         `${rect.width}px`,
    height:        `${rect.height}px`,
    overflow:      'hidden',
    zIndex:        '9000',
    pointerEvents: 'none',
  })

  // Inner image stays full-viewport-sized so it looks correct as the
  // container expands — avoids a "zooming postage stamp" effect. The
  // scale(1.16) translateY(-8%) matches the destination trip-hero's initial
  // parallax state (set by gsap.fromTo on .trip-hero-img in BaseLayout) —
  // without this, the handoff has a 16% size jump that reads as a flash.
  // If the parallax baseline changes, mirror it here.
  const img = document.createElement('img')
  Object.assign(img.style, {
    position:  'absolute',
    top:       '50%',
    left:      '50%',
    width:     '100vw',
    height:    '100vh',
    objectFit: 'cover',
    transform: 'translate(-50%, -50%) scale(1.16) translateY(-8%)',
  })
  img.src = src
  container.appendChild(img)

  // Match the destination trip-hero's gradient so the bottom darkening doesn't
  // "snap in" the instant the overlay is removed — that flicker reads as a flash.
  // (Mirrors .trip-hero-overlay in global.css; if you change one, change both.)
  const gradient = document.createElement('div')
  Object.assign(gradient.style, {
    position:      'absolute',
    inset:         '0',
    pointerEvents: 'none',
    background:    'linear-gradient(to bottom, rgba(12,9,6,0.1) 0%, rgba(12,9,6,0.0) 35%, rgba(12,9,6,0.55) 72%, rgba(12,9,6,0.95) 100%)',
  })
  container.appendChild(gradient)

  // Append to <html>, not <body> — see note above. A body child would be
  // destroyed by Astro's swap before the destination hero is ready.
  document.documentElement.appendChild(container)

  // Expand to fullscreen, then hand off to Astro's client-side router
  gsap.to(container, {
    top:      0,
    left:     0,
    width:    '100vw',
    height:   '100vh',
    duration: 0.75,
    ease:     'power3.inOut',
    onComplete: () => bypassViewTransition(() => navigate(href)),
  })
}
