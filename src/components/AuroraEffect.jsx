/**
 * AuroraEffect — animated light-ribbon curtains rendered in R3F.
 * Uses additive blending so they glow over the dark photo background.
 */
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uSeed;
  uniform vec3  uColor;
  varying vec2  vUv;

  void main() {
    float x = vUv.x;
    float y = vUv.y;

    // Animated curtain bands
    float b1 = sin(x * 3.5 + uTime * 0.35 + uSeed) * 0.4 + 0.5;
    float b2 = sin(x * 6.0 - uTime * 0.22 + uSeed * 1.8) * 0.3 + 0.4;
    float b3 = sin(x * 1.8 + uTime * 0.18) * 0.5 + 0.5;
    float band = (b1 * b2 + b3 * 0.4) * 0.6;

    // Vertical alpha: fade top + bottom
    float vFade = smoothstep(0.0, 0.18, y) * smoothstep(1.0, 0.72, y);

    // Fine curtain streaks
    float streak = sin(x * 18.0 + band * 5.0 + uTime * 0.6 + uSeed) * 0.5 + 0.5;
    streak = pow(streak, 2.0);

    float intensity = vFade * (band * 0.7 + streak * 0.3);

    gl_FragColor = vec4(uColor * intensity * 1.4, intensity * 0.35);
  }
`

function AuroraRibbon({ position, rotation, scale, seed, color }) {
  const ref = useRef()
  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uSeed:  { value: seed },
    uColor: { value: new THREE.Color(color) },
  }), [seed, color])

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[6, 4, 32, 16]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function AuroraEffect() {
  const ribbons = useMemo(() => [
    { position: [0, 0.5, -1],    rotation: [-0.1, 0.05, 0.1],  scale: [1.4, 1, 1],   seed: 0.0,  color: '#22EE66' },
    { position: [-1.5, 0.2, -2], rotation: [-0.05, 0.1, -0.08], scale: [1.2, 0.9, 1], seed: 1.3,  color: '#33FF77' },
    { position: [1.8, 0.8, -1.5],rotation: [-0.12, -0.08, 0.15],scale: [1.1, 1.1, 1], seed: 2.7,  color: '#11CC88' },
    { position: [-0.5, -0.3, -3],rotation: [0.08, 0.04, -0.05], scale: [1.6, 0.7, 1], seed: 4.1,  color: '#44EE99' },
    { position: [0.5, 1.2, -0.5],rotation: [-0.08, -0.05, 0.06],scale: [1.0, 1.3, 1], seed: 5.5,  color: '#00DDAA' },
  ], [])

  return (
    <group>
      {ribbons.map((r, i) => (
        <AuroraRibbon key={i} {...r} />
      ))}
    </group>
  )
}
