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
import { Sparkles, MeshDistortMaterial, OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Maximize2, Minimize2 } from 'lucide-react'
import * as THREE from 'three'
import type { Book, BookStatus } from '@/lib/types'

/* ────────────────────────────────────────────────────────────────
   "독서 우주" — an artistic 3D helix tower of the reading list.
   Books spiral up a column, each spinning on its own axis. Drag to
   orbit, click a book to re-sort the whole tower around it, and go
   fullscreen to get lost in it. Purely decorative.
   ──────────────────────────────────────────────────────────────── */

type StatusStyle = { grad: [string, string]; glow: string; label: string }

const STATUS: Record<BookStatus, StatusStyle> = {
  reading:      { grad: ['#3b82f6', '#6366f1'], glow: '#3b82f6', label: '읽는 중' },
  completed:    { grad: ['#f59e0b', '#f43f5e'], glow: '#fb923c', label: '완독' },
  want_to_read: { grad: ['#334155', '#64748b'], glow: '#64748b', label: '읽고 싶음' },
}

const TURNS = 2.5
const HEIGHT = 7
const RADIUS = 2.7

// ── generated cover: always CORS-safe, cohesive, instant ────────────
function drawGeneratedCover(book: Book): HTMLCanvasElement {
  const W = 512
  const H = 768
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const st = STATUS[book.status]

  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, st.grad[0])
  g.addColorStop(1, st.grad[1])
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const rg = ctx.createRadialGradient(W / 2, H * 0.4, 80, W / 2, H / 2, H * 0.75)
  rg.addColorStop(0, 'rgba(0,0,0,0)')
  rg.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = rg
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.05
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5)
  }
  ctx.globalAlpha = 1

  const font = '"Apple SD Gothic Neo", -apple-system, "Malgun Gothic", sans-serif'

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `600 26px ${font}`
  ctx.textBaseline = 'top'
  ctx.fillText(st.label, 44, 48)

  if (book.rating > 0) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffd76a'
    ctx.font = `700 30px ${font}`
    ctx.fillText(`★ ${book.rating}`, W - 44, 46)
    ctx.textAlign = 'left'
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = `800 62px ${font}`
  const lines: string[] = []
  let line = ''
  for (const ch of book.title) {
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

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `500 30px ${font}`
  ctx.fillText(book.author, 46, H - 74)

  return c
}

function textureFromCanvas(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const ir = img.width / img.height
  const cr = W / H
  let sw = img.width, sh = img.height, sx = 0, sy = 0
  if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2 }
  else { sh = img.width / cr; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H)
}

/** Generated cover first; upgrade to the real image only if CORS-clean. */
function useCoverTexture(book: Book): THREE.CanvasTexture {
  const [tex, setTex] = useState<THREE.CanvasTexture>(() => textureFromCanvas(drawGeneratedCover(book)))

  useEffect(() => {
    setTex(textureFromCanvas(drawGeneratedCover(book)))
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
        ctx.getImageData(0, 0, 1, 1) // throws if tainted
        setTex(textureFromCanvas(c))
      } catch {
        /* keep generated */
      }
    }
    img.src = book.cover_url
    return () => { disposed = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, book.cover_url, book.title, book.status, book.rating])

  return tex
}

type Placement = { pos: THREE.Vector3; scale: number; focused: boolean }

// ── a single spinning book ──────────────────────────────────────────
function BookSlab({
  book,
  placement,
  spin,
  onHover,
  onSelect,
  highlighted,
}: {
  book: Book
  placement: Placement
  spin: number
  onHover: (b: Book | null) => void
  onSelect: (b: Book) => void
  highlighted: boolean
}) {
  const outer = useRef<THREE.Group>(null)
  const spinner = useRef<THREE.Group>(null)
  const tex = useCoverTexture(book)
  const st = STATUS[book.status]
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, d) => {
    if (outer.current) {
      outer.current.position.lerp(placement.pos, 0.07)
      const s = placement.scale
      outer.current.scale.lerp(tmp.set(s, s, s), 0.1)
    }
    if (spinner.current) spinner.current.rotation.y += d * spin
  })

  const emissive = placement.focused ? 2.2 : highlighted ? 1.4 : 0.55

  return (
    <group ref={outer}>
      <group ref={spinner}>
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); onHover(book) }}
          onPointerOut={() => onHover(null)}
          onClick={(e) => { e.stopPropagation(); onSelect(book) }}
        >
          <boxGeometry args={[1.35, 1.95, 0.16]} />
          <meshStandardMaterial
            color="#0b1020"
            emissive={st.glow}
            emissiveIntensity={emissive}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[1.28, 1.88]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.085]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[1.28, 1.88]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

function Core() {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 0.1 })
  return (
    <mesh ref={ref} scale={0.9}>
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

// glowing central axis of the tower
function AxisBeam() {
  return (
    <mesh>
      <cylinderGeometry args={[0.035, 0.035, HEIGHT + 3, 12]} />
      <meshBasicMaterial color="#6aa0ff" toneMapped={false} transparent opacity={0.45} />
    </mesh>
  )
}

function helixSlot(rank: number, count: number): THREE.Vector3 {
  const t = count <= 1 ? 0.5 : rank / (count - 1)
  const theta = t * TURNS * Math.PI * 2
  return new THREE.Vector3(
    Math.cos(theta) * RADIUS,
    (t - 0.5) * HEIGHT,
    Math.sin(theta) * RADIUS,
  )
}

function Tower({
  books,
  focusedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  books: Book[]
  focusedId: string | null
  hoveredId: string | null
  onHover: (b: Book | null) => void
  onSelect: (b: Book) => void
}) {
  const spinGroup = useRef<THREE.Group>(null)

  // arrangement: default order, or sorted around the focused book
  const placements = useMemo(() => {
    const map = new Map<string, Placement>()
    const focused = focusedId ? books.find((b) => b.id === focusedId) ?? null : null

    if (!focused) {
      books.forEach((b, i) => {
        map.set(b.id, { pos: helixSlot(i, books.length), scale: hoveredId === b.id ? 1.25 : 1, focused: false })
      })
      return map
    }

    // focused book floats as a crown; the rest re-sort around it
    const rest = books
      .filter((b) => b.id !== focused.id)
      .sort((a, b) => {
        const sa = a.status === focused.status ? 0 : 1
        const sb = b.status === focused.status ? 0 : 1
        if (sa !== sb) return sa - sb
        const ra = Math.abs(a.rating - focused.rating)
        const rb = Math.abs(b.rating - focused.rating)
        if (ra !== rb) return ra - rb
        return a.title.localeCompare(b.title)
      })

    map.set(focused.id, { pos: new THREE.Vector3(0, HEIGHT / 2 + 1.1, 1.6), scale: 1.7, focused: true })
    rest.forEach((b, i) => {
      map.set(b.id, { pos: helixSlot(i, rest.length), scale: hoveredId === b.id ? 1.2 : 0.92, focused: false })
    })
    return map
  }, [books, focusedId, hoveredId])

  useFrame((_, d) => {
    if (spinGroup.current) spinGroup.current.rotation.y += d * 0.05
  })

  return (
    <group ref={spinGroup}>
      <Core />
      <AxisBeam />
      {books.map((b, i) => {
        const placement = placements.get(b.id)
        if (!placement) return null
        const spin = (0.22 + (i % 3) * 0.14) * (i % 2 === 0 ? 1 : -1)
        return (
          <BookSlab
            key={b.id}
            book={b}
            placement={placement}
            spin={spin}
            onHover={onHover}
            onSelect={onSelect}
            highlighted={hoveredId === b.id}
          />
        )
      })}
      <Sparkles count={110} scale={[12, 14, 12]} size={2.4} speed={0.25} color="#7aa2ff" opacity={0.6} noise={1.5} />
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
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  const select = (b: Book) => setFocusedId((cur) => (cur === b.id ? null : b.id))

  // fullscreen / expanded overlay
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sectionRef.current?.requestFullscreen?.().catch(() => {})
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [expanded])

  const focusedBook = focusedId ? books.find((b) => b.id === focusedId) ?? null : null
  const captionBook = hovered ?? focusedBook

  return (
    <section
      ref={sectionRef}
      className={
        'group overflow-hidden bg-[#070914] border border-white/10 ' +
        (expanded
          ? 'fixed inset-0 z-[60] rounded-none'
          : 'relative rounded-[28px] h-[440px] sm:h-[560px]')
      }
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 15%, rgba(59,110,246,0.28), transparent 55%), radial-gradient(80% 80% at 82% 92%, rgba(244,63,94,0.16), transparent 60%), #070914',
        }}
        aria-hidden
      />

      {/* label */}
      <div className="absolute top-6 left-6 sm:top-7 sm:left-8 z-10 pointer-events-none">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50 uppercase">
          Reading Universe
        </p>
        <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">독서 우주</h2>
      </div>

      {/* controls */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
        {focusedId && (
          <button
            type="button"
            onClick={() => setFocusedId(null)}
            className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            정렬 해제
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? '전체화면 종료' : '전체화면'}
          className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 p-2 text-white transition-colors"
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* 3D */}
      <div className="absolute inset-0">
        <SceneBoundary fallback={null}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            camera={{ position: [0, 1.5, 11], fov: 46 }}
            onPointerMissed={() => setFocusedId(null)}
          >
            <color attach="background" args={['#070914']} />
            <fog attach="fog" args={['#070914', 10, 26]} />
            <ambientLight intensity={0.6} />
            <pointLight position={[0, 0, 0]} intensity={34} color="#4f7cff" />
            <directionalLight position={[5, 8, 6]} intensity={1.1} />
            <Tower
              books={books}
              focusedId={focusedId}
              hoveredId={hovered?.id ?? null}
              onHover={setHovered}
              onSelect={select}
            />
            <OrbitControls
              makeDefault
              enablePan={false}
              enableZoom={expanded}
              enableDamping
              dampingFactor={0.08}
              rotateSpeed={0.6}
              minDistance={6}
              maxDistance={18}
              minPolarAngle={Math.PI * 0.15}
              maxPolarAngle={Math.PI * 0.85}
            />
            <EffectComposer>
              <Bloom mipmapBlur intensity={1.2} luminanceThreshold={0.5} luminanceSmoothing={0.9} radius={0.72} />
              <Vignette eskil={false} offset={0.25} darkness={0.9} />
            </EffectComposer>
          </Canvas>
        </SceneBoundary>
      </div>

      {/* caption */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex justify-center px-6 pointer-events-none">
        <div className="max-w-full rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 text-center">
          {captionBook ? (
            <p className="text-[13px] text-white truncate">
              {focusedBook && !hovered && <span className="text-white/50">기준 · </span>}
              <span className="font-semibold">{captionBook.title}</span>
              <span className="text-white/60"> · {captionBook.author}</span>
              {captionBook.rating > 0 && <span className="text-amber-300"> · ★ {captionBook.rating}</span>}
            </p>
          ) : (
            <p className="text-[13px] text-white/70">
              {books.length > 0
                ? '드래그로 회전 · 책을 클릭하면 그 책 기준으로 정렬돼요'
                : '책을 추가하면 우주가 채워집니다'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
