'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, RoundedBox, MeshDistortMaterial, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

type BookConfig = {
  pos: [number, number, number]
  rot: [number, number, number]
  color: string
  scale: number
  emissive?: string
}

// Floating 3D books arranged at varied depths around the core.
const BOOKS: BookConfig[] = [
  { pos: [-2.6, 0.9, -0.8], rot: [0.3, 0.5, 0.14], color: '#3182f6', scale: 1.0, emissive: '#1f5fd0' },
  { pos: [2.5, 1.05, -0.4], rot: [-0.2, -0.4, -0.1], color: '#ffffff', scale: 1.05 },
  { pos: [-1.95, -1.25, 0.5], rot: [0.16, 0.3, -0.2], color: '#22d3ee', scale: 0.9, emissive: '#0e7490' },
  { pos: [2.15, -1.05, 0.6], rot: [-0.25, 0.22, 0.18], color: '#6366f1', scale: 0.95, emissive: '#3730a3' },
  { pos: [0.15, 2.0, -1.5], rot: [0.4, -0.3, 0.1], color: '#ffb020', scale: 0.78, emissive: '#b45309' },
  { pos: [-3.15, -0.15, -1.6], rot: [0.1, 0.6, -0.15], color: '#e7ebf0', scale: 0.74 },
  { pos: [3.2, 0.25, -1.9], rot: [-0.3, -0.2, 0.2], color: '#3182f6', scale: 0.7, emissive: '#1f5fd0' },
]

function Book({ pos, rot, color, scale, emissive }: BookConfig) {
  return (
    <Float speed={1.8} rotationIntensity={0.5} floatIntensity={0.9} floatingRange={[-0.15, 0.15]}>
      <group position={pos} rotation={rot} scale={scale}>
        <RoundedBox args={[1.25, 1.75, 0.28]} radius={0.09} smoothness={6}>
          <meshStandardMaterial
            color={color}
            roughness={0.3}
            metalness={0.1}
            emissive={emissive ?? '#000000'}
            emissiveIntensity={emissive ? 0.18 : 0}
          />
        </RoundedBox>
        {/* page block along the fore-edge for a booky silhouette */}
        <mesh position={[0.56, 0, 0]}>
          <boxGeometry args={[0.05, 1.62, 0.24]} />
          <meshStandardMaterial color="#fbfbfd" roughness={0.7} />
        </mesh>
      </group>
    </Float>
  )
}

// Iridescent, gently-distorting core — the "energy" the books orbit.
function Core() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.15, 96, 96]} />
      <MeshDistortMaterial
        color="#3182f6"
        distort={0.38}
        speed={1.5}
        roughness={0.12}
        metalness={0.4}
        emissive="#1f5fd0"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

// Slow ambient auto-rotation for the whole cluster.
function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.09
  })
  return <group ref={ref}>{children}</group>
}

// Parallax rig — tilts the scene toward the pointer. Reads the global pointer
// (via a window listener) so the canvas itself can stay pointer-events-none
// and never intercept clicks meant for the UI above it.
function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame(() => {
    if (!group.current) return
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      target.current.x * 0.35,
      0.045,
    )
    group.current.rotation.x = THREE.MathUtils.lerp(
      group.current.rotation.x,
      target.current.y * 0.22,
      0.045,
    )
  })

  return <group ref={group}>{children}</group>
}

export default function Scene3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 6.6], fov: 42 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={1.25} />
      <pointLight position={[-6, -2, 3]} intensity={45} color="#3182f6" />
      <pointLight position={[6, 3, -3]} intensity={28} color="#22d3ee" />

      <Rig>
        <AutoRotate>
          <Core />
          {BOOKS.map((b, i) => (
            <Book key={i} {...b} />
          ))}
        </AutoRotate>
        <Sparkles
          count={54}
          scale={[11, 6, 4]}
          size={2.2}
          speed={0.28}
          color="#3182f6"
          opacity={0.5}
          noise={1}
        />
      </Rig>
    </Canvas>
  )
}
