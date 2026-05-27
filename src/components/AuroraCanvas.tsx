/**
 * AuroraCanvas — React island.
 * Wraps the R3F Canvas + AuroraEffect shader.
 * Uses client:visible — defers the Three.js bundle (~180KB) until
 * the aurora section scrolls into view.
 */
import { Canvas } from '@react-three/fiber'
import AuroraEffect from './AuroraEffect'

export default function AuroraCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 65 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <AuroraEffect />
    </Canvas>
  )
}
