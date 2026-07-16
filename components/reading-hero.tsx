'use client'

import { Component, useMemo, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Sparkles } from 'lucide-react'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

// 3D scene is client-only (WebGL) and code-split so it never blocks first paint.
const Scene3D = dynamic(() => import('./scene-3d'), {
  ssr: false,
  loading: () => null,
})

/** If WebGL is unavailable or the scene throws, we silently keep the gradient. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

interface ReadingHeroProps {
  books: Book[]
  onAddBook: () => void
}

export function ReadingHero({ books, onAddBook }: ReadingHeroProps) {
  const stats = useMemo(() => {
    const year = new Date().getFullYear()
    const completed = books.filter(
      (b) => b.status === 'completed' && b.finished_at?.startsWith(String(year)),
    ).length
    const reading = books.filter((b) => b.status === 'reading').length
    return { year, total: books.length, completed, reading }
  }, [books])

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-border/60',
        'bg-gradient-to-b from-card to-background',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_18px_50px_-20px_rgba(20,40,90,0.28)]',
        'h-[360px] sm:h-[400px]',
      )}
    >
      {/* Soft ambient wash — always present, so the hero looks good even before
          (or without) WebGL. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(115% 115% at 72% 22%, color-mix(in oklch, var(--primary) 24%, transparent), transparent 58%)',
        }}
        aria-hidden
      />

      {/* 3D layer */}
      <div className="absolute inset-0 pointer-events-none">
        <SceneBoundary>
          <Scene3D />
        </SceneBoundary>
      </div>

      {/* Legibility scrim for the text side */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/35 to-transparent sm:to-transparent"
        aria-hidden
      />

      {/* Foreground content */}
      <div className="relative z-10 h-full flex flex-col justify-end p-6 sm:p-9">
        <div
          className="animate-rise inline-flex items-center gap-1.5 self-start rounded-full bg-card/70 backdrop-blur-md border border-border/60 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
          style={{ animationDelay: '40ms' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {stats.year} · Reading Log
        </div>

        <h2
          className="animate-rise mt-3 text-[40px] sm:text-[56px] font-bold tracking-[-0.03em] leading-[0.98] text-foreground"
          style={{ animationDelay: '90ms' }}
        >
          내 책장
        </h2>

        <p
          className="animate-rise mt-2 text-[15px] sm:text-base text-muted-foreground"
          style={{ animationDelay: '150ms' }}
        >
          지금까지{' '}
          <span className="font-semibold text-foreground tabular">{stats.total}</span>권 기록 · 올해{' '}
          <span className="font-semibold text-primary tabular">{stats.completed}</span>권 완독
        </p>

        <div
          className="animate-rise mt-5 flex items-center gap-3"
          style={{ animationDelay: '210ms' }}
        >
          <button
            type="button"
            onClick={onAddBook}
            className={cn(
              'inline-flex items-center gap-1.5 pl-3.5 pr-4 py-2.5 rounded-full text-sm font-semibold',
              'bg-primary text-primary-foreground',
              'shadow-[0_6px_20px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)]',
              'hover:brightness-105 active:scale-[0.96] transition-all duration-150',
            )}
          >
            <Plus className="w-4 h-4" />
            책 추가
          </button>

          {stats.reading > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/70 backdrop-blur-md border border-border/60 px-3 py-2 text-[13px] font-medium text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              읽는 중 <span className="tabular font-semibold">{stats.reading}</span>권
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
