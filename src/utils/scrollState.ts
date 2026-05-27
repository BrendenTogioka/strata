// Shared mutable scroll state.
// Written by the Lenis script in BaseLayout, read by StarField useFrame.
// Since Astro script bundles and React island bundles are separate,
// we bridge via window.__scrollState rather than a shared module.
export const scrollState = {
  progress: 0,
  velocity: 0,
}

// Extend window type for the bridge
declare global {
  interface Window {
    __scrollState: { progress: number; velocity: number }
  }
}
