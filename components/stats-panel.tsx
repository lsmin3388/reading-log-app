'use client'

import { useMemo } from 'react'
import { BookMarked, Star, Library } from 'lucide-react'
import type { Book } from '@/lib/types'

interface StatsPanelProps {
  books: Book[]
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

export function StatsPanel({ books }: StatsPanelProps) {
  const thisYear = useMemo(() => new Date().getFullYear(), [])

  const completedThisYear = useMemo(
    () =>
      books.filter(
        (b) => b.status === 'completed' && b.finished_at?.startsWith(String(thisYear)),
      ),
    [books, thisYear],
  )

  const avgRating = useMemo(() => {
    const rated = completedThisYear.filter((b) => b.rating > 0)
    if (rated.length === 0) return null
    return (rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1)
  }, [completedThisYear])

  const monthlyCounts = useMemo(() => {
    const counts = Array(12).fill(0)
    completedThisYear.forEach((b) => {
      if (b.finished_at) {
        const month = new Date(b.finished_at).getMonth()
        if (month >= 0 && month < 12) counts[month]++
      }
    })
    return counts
  }, [completedThisYear])

  const maxCount = Math.max(...monthlyCounts, 1)
  const currentMonth = new Date().getMonth()

  return (
    <section
      aria-label="독서 통계"
      className="rounded-[24px] bg-card border border-border/70 p-5 sm:p-6 flex flex-col gap-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_30px_-18px_rgba(20,40,90,0.25)]"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">{thisYear}년 독서 기록</h2>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip
          icon={<BookMarked className="w-[18px] h-[18px]" />}
          label="완독"
          value={completedThisYear.length}
          suffix="권"
        />
        <StatChip
          icon={<Star className="w-[18px] h-[18px]" />}
          label="평균 별점"
          value={avgRating ?? '—'}
        />
        <StatChip
          icon={<Library className="w-[18px] h-[18px]" />}
          label="전체 책"
          value={books.length}
          suffix="권"
        />
      </div>

      {/* Monthly bar chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">월별 완독 수</p>
        <div className="flex items-end gap-1.5 h-24">
          {monthlyCounts.map((count, i) => (
            <div key={i} className="group flex flex-col items-center gap-1.5 flex-1">
              <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                <div
                  className="w-full max-w-[22px] rounded-full bg-primary/75 group-hover:bg-primary transition-all duration-300 cursor-default"
                  style={{
                    height: count === 0 ? '3px' : `${Math.max((count / maxCount) * 64, 6)}px`,
                    opacity: count === 0 ? 0.25 : 1,
                  }}
                  title={`${MONTH_LABELS[i]}: ${count}권`}
                />
              </div>
              <span
                className={
                  'text-[10px] leading-none tabular ' +
                  (i === currentMonth ? 'text-primary font-semibold' : 'text-muted-foreground')
                }
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatChip({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 border border-border/50 p-3.5">
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[26px] font-bold text-foreground leading-none tracking-tight tabular">
          {value}
        </span>
        {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
