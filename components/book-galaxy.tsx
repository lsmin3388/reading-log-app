'use client'

import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, MeshDistortMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Book, BookStatus } from '@/lib/types'

/* ────────────────────────────────────────────────────────────────
   "독서 우주" — an artistic 3D constellation of the reading list.
   Each book becomes a glowing slab on a slowly-orbiting sphere.
   Purely decorative; it just wants to be beautiful and a little weird.
   ──────────────────────────────────────────────────────────────── */

type StatusStyle = { grad: [string, string]; glow: string; label: string }

const STATUS: Record<BookStatus, StatusStyle> = {
  reading:      { grad: ['#3b82f6', '#6366f1'], glow: '#3b82f6', label: '읽는 중' },
  completed:    { grad: ['#f59e0b', '#f43f5e'], glow: '#fb923c', label: '완독' },
  want_to_read: { grad: ['#334155', '#64748b'], glow: '#64748b', label: '읽고 싶음' },
}

// ── generated cover: always CORS-safe, cohesive, instant ────────────
function drawGeneratedCover(book: Book): HTMLCanvasElement {
  const W = 512
  const H = 768
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const st = STATUS[book.status]

  // diagonal gradient
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, st.grad[0])
  g.addColorStop(1, st.grad[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // corner vignette
  const rg = ctx.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H / 2, H * 0.75)
  rg.addColorStop(0, 'rgba(0,0,0,0)')
  rg.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)

  // grain
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  const font = '"Apple SD Gothic Neo", -apple-system, "Malgun Gothic", sans-serif'

  // status pill (top)
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `600 26px ${font}`
  ctx.textBaseline = 'top'
  ctx.fillText(st.label.toUpperCase?.() ?? st.label, 44, 48)

  // rating (top-right)
  if (book.rating > 0) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffd76a'
    ctx.font = `700 30px ${font}`
    ctx.fillText(`★ ${book.rating}`, W - 44, 46)
    ctx.textAlign = 'left'
  }

  // title (wrapped, bottom-anchored)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 62px ${font}`
  const words = book.title.split('')
  const lines: string[] = []
  let line = ''
  for (const ch of words) {
    if (ctx.measureText(line + ch).width > W - 88 && line) {
      lines.push(line)
      line = ch
    } else line += ch
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 3)
  let y = H - 140 - (shown.length - 1) * 66
  for (const l of shown) {
    ctx.fillText(l, 44, y)
    y += 66
  }

  // author
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `500 30px ${font}`
  ctx.fillText(book.author, 46, H - 74)

  return c
}

function coverTextureFromCanvas(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// object-fit: cover, drawing a real image into the canvas
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const ir = img.width / img.height
  const cr = W / H
  let sw = img.width
  let sh = img.height
  let sx = 0
  let sy = 0
  if (ir > cr) {
    sw = img.height * cr
    sx = (img.width - sw) / 2
  } else {
    sh = img.width / cr
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
}

/** Texture that starts as the generated cover, then upgrades to the real
 *  cover image only if it loads AND is CORS-clean (never taints the canvas). */
function useCoverTexture(book: Book): THREE.CanvasTexture {
  const [tex, setTex] = useState<THREE.CanvasTexture>(() =>
    coverTextureFromCanvas(drawGeneratedCover(book)),
  )

  useEffect(() => {
    const generated = coverTextureFromCanvas(drawGeneratedCover(book))
    setTex(generated)
    if (!book.cover_url) return

    let disposed = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (disposed) return
      try {
        const c = document.createElement('canvas')
        c.width = 512
        c.height = 768
        const ctx = c.getContext('2d')!
        drawImageCover(ctx, img, 512, 768)
        ctx.getImageData(0, 0, 1, 1) // throws if the image tainted the canvas
        setTex(coverTextureFromCanvas(c))
      } catch {
        /* tainted or blocked — keep the generated cover */
      }
    }
    img.src = book.cover_url

    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.cover_url, book.title, book.status, book.rating])

  return tex
}

// ── a single floating book ──────────────────────────────────────────
function BookSlab({
  book,
  position,
  quaternion,
  hovered,
  onHover,
}: {
  book: Book
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  hovered: boolean
  onHover: (b: Book | null) => void
}) {
  const group = useRef<THREE.Group>(null)
  const tex = useCoverTexture(book)
  const st = STATUS[book.status]
  const seed = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    // gentle breathing + hover pop
    const target = hovered ? 1.28 : 1
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12)
    // subtle bob along its own outward axis
    group.current.position.copy(position)
    group.current.position.addScaledVector(
      position.clone().normalize(),
      Math.sin(t * 0.8 + seed) * 0.12,
    )
  })

  return (
    <group ref={group} position={position} quaternion={quaternion}>
      {/* book body */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(book)
        }}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[1.35, 1.95, 0.16]} />
        <meshStandardMaterial
          color="#0b1020"
          emissive={st.glow}
          emissiveIntensity={hovered ? 1.4 : 0.55}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      {/* cover face */}
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[1.28, 1.88]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Core() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.1
  })
  return (
    <mesh ref={ref} scale={1.15}>
      <icosahedronGeometry args={[1, 6]} />
      <MeshDistortMaterial
        color="#4f7cff"
        emissive="#1e3a8a"
        emissiveIntensity={0.7}
        distort={0.45}
        speed={1.4}
        roughness={0.1}
        metalness={0.5}
      />
    </mesh>
  )
}

function Galaxy({ books, onHover, hoveredId }: {
  books: Book[]
  onHover: (b: Book | null) => void
  hoveredId: string | null
}) {
  const rig = useRef<THREE.Group>(null)
  const pointer = useRef({ x: 0, y: 0 })

  const placed = useMemo(() => {
    const n = books.length
    const R = Math.min(Math.max(2.2 + n * 0.12, 2.6), 4.6)
    const golden = Math.PI * (3 - Math.sqrt(5))
    const up = new THREE.Vector3(0, 1, 0)
    return books.map((book, i) => {
      const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = i * golden
      const position = new THREE.Vector3(
        Math.cos(theta) * r,
        y,
        Math.sin(theta) * r,
      ).multiplyScalar(R)
      // face outward: +Z away from centre
      const m = new THREE.Matrix4().lookAt(position, new THREE.Vector3(0, 0, 0), up)
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(m)
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(up, Math.PI))
      return { book, position, quaternion }
    })
  }, [books])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((_, d) => {
    if (!rig.current) return
    rig.current.rotation.y += d * 0.12
    rig.current.rotation.x = THREE.MathUtils.lerp(
      rig.current.rotation.x,
      pointer.current.y * 0.25,
      0.04,
    )
  })

  return (
    <group ref={rig}>
      <Core />
      {placed.map(({ book, position, quaternion }) => (
        <BookSlab
          key={book.id}
          book={book}
          position={position}
          quaternion={quaternion}
          hovered={hoveredId === book.id}
          onHover={onHover}
        />
      ))}
      <Sparkles count={90} scale={[13, 13, 13]} size={2.4} speed={0.25} color="#7aa2ff" opacity={0.6} noise={1.5} />
    </group>
  )
}

/** WebGL failure → keep the gradient section, no crash. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function BookGalaxy({ books }: { books: Book[] }) {
  const [hovered, setHovered] = useState<Book | null>(null)

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 h-[440px] sm:h-[560px] bg-[#070914]">
      {/* deep cosmic wash (also the WebGL-off fallback look) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 18%, rgba(59,110,246,0.28), transparent 55%), radial-gradient(80% 80% at 80% 90%, rgba(244,63,94,0.18), transparent 60%), #070914',
        }}
        aria-hidden
      />

      {/* label */}
      <div className="absolute top-6 left-6 sm:top-7 sm:left-8 z-10 pointer-events-none">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase">
          Reading Universe
        </p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
          독서 우주
        </h2>
      </div>

      {/* 3D */}
      <div className="absolute inset-0">
        <SceneBoundary fallback={null}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0, 9], fov: 46 }}
          >
            <color attach="background" args={['#070914']} />
            <fog attach="fog" args={['#070914', 9, 22]} />
            <ambientLight intensity={0.6} />
            <pointLight position={[0, 0, 0]} intensity={30} color="#4f7cff" />
            <directionalLight position={[5, 6, 5]} intensity={1.1} />
            <Galaxy books={books} onHover={setHovered} hoveredId={hovered?.id ?? null} />
            <EffectComposer>
              <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.5} luminanceSmoothing={0.9} radius={0.7} />
              <Vignette eskil={false} offset={0.25} darkness={0.85} />
            </EffectComposer>
          </Canvas>
        </SceneBoundary>
      </div>

      {/* caption */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center px-6 pointer-events-none">
        <div
          className={
            'max-w-full rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 text-center transition-all duration-300 ' +
            (hovered ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-0')
          }
        >
          {hovered ? (
            <p className="text-[13px] text-white truncate">
              <span className="font-semibold">{hovered.title}</span>
              <span className="text-white/60"> · {hovered.author}</span>
              {hovered.rating > 0 && <span className="text-amber-300"> · ★ {hovered.rating}</span>}
            </p>
          ) : (
            <p className="text-[13px] text-white/70">
              {books.length > 0 ? '책 위에 마우스를 올려보세요 · 드래그하듯 움직여보세요' : '책을 추가하면 우주가 채워집니다'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
