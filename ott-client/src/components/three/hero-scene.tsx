/*
 * The home hero's Three.js scene (the app's one Three.js canvas; see CLAUDE.md motion rules).
 * Soft particles drifting up through a few faint light beams, coloured from the stream glow tokens.
 * Reacts to the pointer (camera parallax, near particles shift more) and to scroll (lifts and fades out).
 * Kept light: DPR capped at 1.5, no antialiasing, additive blending without depth, ~1.2k points
 * (500 on touch devices), and frameloop "never" while it is off screen or the tab is hidden.
 * Loaded lazily by HeroAtmosphere, which also decides whether it may run at all.
 */
import { useMemo, useRef, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type HeroSceneProps = {
  /** 0..1 as the hero scrolls away (written by the page, read every frame) */
  progressRef: RefObject<number>
  /** pointer position, -1..1 on both axes (written on pointermove, read every frame) */
  pointerRef: RefObject<{ x: number; y: number }>
  /** false while off screen or the tab is hidden: no frames are rendered */
  active: boolean
  particleCount: number
  onReady?: () => void
}

/** Reads a CSS colour token (any syntax the browser knows, including oklch) as a THREE.Color */
function cssColor(variable: string, fallback: string) {
  const value =
    getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim() || fallback
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return new THREE.Color(fallback)
  ctx.fillStyle = value
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return new THREE.Color(r / 255, g / 255, b / 255)
}

const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  varying float vAlpha;
  varying float vMix;
  void main() {
    vec3 p = position;
    // drift upward at a per-particle speed, wrapping inside a 10-unit tall box
    p.y = mod(p.y + uTime * (0.12 + aSeed * 0.2) + 5.0, 10.0) - 5.0;
    p.x += sin(uTime * 0.3 + aSeed * 6.2831) * 0.18;
    // nearer particles follow the pointer more: depth parallax
    float depth = clamp((p.z + 6.0) / 8.0, 0.0, 1.0);
    p.xy += uPointer * (0.1 + 0.45 * depth);
    p.y += uProgress * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (10.0 / -mv.z);
    float edges = smoothstep(-5.0, -3.6, p.y) * (1.0 - smoothstep(3.6, 5.0, p.y));
    vAlpha = (0.25 + 0.75 * fract(aSeed * 13.7)) * edges * (1.0 - uProgress);
    vMix = aSeed;
  }
`

const PARTICLE_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), a * vAlpha * 0.9);
  }
`

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = pow(1.0 - x, 3.0);
    float fall = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    float breathe = 0.7 + 0.3 * sin(uTime * 0.5 + uSeed * 10.0);
    gl_FragColor = vec4(uColor, core * fall * breathe * uOpacity);
  }
`

/** Small seeded PRNG (mulberry32): the field is a pure function of its size, and looks the same every load */
function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BEAMS = [
  { x: -4.2, rot: 0.32, tone: 'a', seed: 0.1 },
  { x: -1.2, rot: 0.18, tone: 'c', seed: 0.4 },
  { x: 1.8, rot: -0.12, tone: 'b', seed: 0.7 },
  { x: 4.6, rot: -0.3, tone: 'a', seed: 0.9 },
] as const

const BEAM_OPACITY = 0.14

function Field({
  progressRef,
  pointerRef,
  particleCount,
}: Omit<HeroSceneProps, 'active' | 'onReady'>) {
  const pointer = useRef(new THREE.Vector2())
  const beamGroup = useRef<THREE.Group>(null)
  const particleMaterial = useRef<THREE.ShaderMaterial>(null)
  const beamMaterials = useRef<(THREE.ShaderMaterial | null)[]>([])

  const colors = useMemo(
    () => ({
      a: cssColor('--stream-glow-1', '#f0956a'),
      b: cssColor('--stream-glow-2', '#e0559a'),
      c: cssColor('--stream-glow-3', '#8a6cf0'),
    }),
    []
  )

  const attributes = useMemo(() => {
    const random = seededRandom(7)
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const seeds = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (random() - 0.5) * 16
      positions[i * 3 + 1] = (random() - 0.5) * 10
      positions[i * 3 + 2] = -6 + random() * 8
      sizes[i] = 1.5 + random() * 4.5
      seeds[i] = random()
    }
    return { positions, sizes, seeds }
  }, [particleCount])

  // initial uniform values; useFrame updates them through the material refs
  const particleUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.5) },
      uPointer: { value: new THREE.Vector2() },
      uColorA: { value: colors.a },
      uColorB: { value: colors.b },
    }),
    [colors]
  )
  const beamUniforms = useMemo(
    () =>
      BEAMS.map((b) => ({
        uColor: { value: colors[b.tone] },
        uTime: { value: 0 },
        uSeed: { value: b.seed },
        uOpacity: { value: BEAM_OPACITY },
      })),
    [colors]
  )

  useFrame((state, delta) => {
    const material = particleMaterial.current
    if (!material) return
    const dt = Math.min(delta, 0.05)
    const progress = progressRef.current ?? 0
    // ease the pointer so the scene glides rather than snaps
    const target = pointerRef.current ?? { x: 0, y: 0 }
    const p = pointer.current
    p.x += (target.x - p.x) * Math.min(1, dt * 3)
    p.y += (target.y - p.y) * Math.min(1, dt * 3)

    const u = material.uniforms
    u.uTime.value += dt
    u.uProgress.value = progress
    u.uPointer.value.copy(p)

    for (const beam of beamMaterials.current) {
      if (!beam) continue
      beam.uniforms.uTime.value = u.uTime.value
      beam.uniforms.uOpacity.value = BEAM_OPACITY * (1 - progress)
    }
    if (beamGroup.current) {
      beamGroup.current.rotation.z = p.x * -0.05
      beamGroup.current.position.y = progress * 1.2
    }

    state.camera.position.x = p.x * 0.5
    state.camera.position.y = p.y * 0.3
    state.camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <group ref={beamGroup} position={[0, 0, -4]}>
        {BEAMS.map((b, i) => (
          <mesh key={b.seed} position={[b.x, 0.5, 0]} rotation={[0, 0, b.rot]}>
            <planeGeometry args={[2.4, 16]} />
            <shaderMaterial
              ref={(m: THREE.ShaderMaterial | null) => {
                beamMaterials.current[i] = m
              }}
              vertexShader={BEAM_VERT}
              fragmentShader={BEAM_FRAG}
              uniforms={beamUniforms[i]}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach='attributes-position'
            args={[attributes.positions, 3]}
          />
          <bufferAttribute
            attach='attributes-aSize'
            args={[attributes.sizes, 1]}
          />
          <bufferAttribute
            attach='attributes-aSeed'
            args={[attributes.seeds, 1]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={particleMaterial}
          vertexShader={PARTICLE_VERT}
          fragmentShader={PARTICLE_FRAG}
          uniforms={particleUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
}

export default function HeroScene({
  active,
  onReady,
  ...field
}: HeroSceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? 'always' : 'never'}
      gl={{
        antialias: false,
        alpha: true,
        depth: false,
        powerPreference: 'low-power',
      }}
      camera={{ position: [0, 0, 6], fov: 55, near: 0.1, far: 30 }}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={() => onReady?.()}
      aria-hidden='true'
    >
      <Field {...field} />
    </Canvas>
  )
}
