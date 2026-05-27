/**
 * StarField — React island.
 * Merges Scene.jsx + Stars.jsx into a single file.
 * Uses client:load — stars are visible on first paint (fixed background).
 * Reads window.__scrollState (set by Lenis in BaseLayout) for subtle
 * twinkle speed variation without causing React re-renders.
 */
import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STAR_COUNT = 1200

const vertexShader = /* glsl */`
  attribute float aSize;
  uniform float uTime;
  uniform float uVelocity;
  varying float vAlpha;
  void main() {
    float speed = 1.0 + uVelocity * 2.0;
    vAlpha = 0.2 + 0.5 * sin(uTime * 0.3 * speed + position.x * 2.1 + position.y * 1.7);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`

const fragmentShader = /* glsl */`
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = (0.5 - d) * 2.0 * vAlpha;
    gl_FragColor = vec4(0.95, 0.90, 0.82, a * 0.8);
  }
`

function Stars() {
  const ref = useRef<THREE.Points>(null)

  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3)
    const sizes     = new Float32Array(STAR_COUNT)
    for (let i = 0; i < STAR_COUNT; i++) {
      const r     = 8 + Math.random() * 18
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      sizes[i] = 0.5 + Math.random() * 2.0
    }
    return { positions, sizes }
  }, [])

  const uniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uVelocity: { value: 0 },
  }), [])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
    // Read velocity from window bridge (written by Lenis in BaseLayout)
    uniforms.uVelocity.value = Math.abs(window.__scrollState?.velocity ?? 0)
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
    return geo
  }, [positions, sizes])

  return (
    <points ref={ref} geometry={geometry}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

export default function StarField() {
  return (
    <div className="canvas-wrap">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <Stars />
      </Canvas>
    </div>
  )
}
