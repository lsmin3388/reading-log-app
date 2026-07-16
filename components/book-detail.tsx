'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X, Pencil, Trash2, BookOpen, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RatingStars } from './rating-stars'
import { STATUS_LABELS } from '@/lib/types'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookDetailProps {
  book: Book | null
  onClose: () => void
  onEdit: (book: Book) => void
  onDelete: (id: string) => void
}

const STATUS_BADGE_STYLES = {
  reading: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-accent text-accent-foreground border-border',
  want_to_read: 'bg-muted text-muted-foreground border-border',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function readingDays(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null
  // Inclusive of both the start and finish day (same-day read = 1일).
  const days = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
  return `${days}일`
}

export function BookDetail({ book, onClose, onEdit, onDelete }: BookDetailProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const open = book !== null

  // Reset the cover fallback whenever a different book is shown.
  useEffect(() => {
    setImageFailed(false)
  }, [book?.id])

  // Close on Escape and lock body scroll while the panel is open.
  useEffect(() => {
    if (!open) return
    setConfirmingDelete(false)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!book) return null

  const days = readingDays(book.started_at, book.finished_at)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md z-50',
          'bg-card flex flex-col',
          'border-l border-border/70 rounded-l-[24px] overflow-hidden',
          'shadow-[0_8px_60px_-12px_rgba(20,40,90,0.35)]',
          'animate-in slide-in-from-right duration-300 ease-out',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="책 상세 정보"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-serif text-lg font-semibold text-foreground">책 상세</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted text-muted-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {/* Cover + basic info */}
          <div className="flex gap-5">
            <div className="relative w-28 aspect-[2/3] rounded-lg overflow-hidden border border-border shrink-0 shadow-sm">
              {book.cover_url && !imageFailed ? (
                <Image
                  src={book.cover_url}
                  alt={`${book.title} 표지`}
                  fill
                  sizes="112px"
                  className="object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-muted">
                  <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center gap-2 min-w-0">
              <span
                className={cn(
                  'self-start px-2 py-0.5 rounded-full text-[11px] font-medium border',
                  STATUS_BADGE_STYLES[book.status],
                )}
              >
                {STATUS_LABELS[book.status]}
              </span>
              <h3 className="font-serif text-xl font-bold leading-tight text-foreground text-balance">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              {book.rating > 0 ? (
                <div className="flex items-center gap-2 mt-1">
                  <RatingStars value={book.rating} readonly size="md" />
                  <span className="text-sm font-medium text-foreground">{book.rating}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">평점 없음</p>
              )}
            </div>
          </div>

          {/* Reading period */}
          {(book.started_at || book.finished_at) && (
            <div className="rounded-xl bg-secondary border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="w-4 h-4 text-primary" />
                독서 기간
                {days && (
                  <span className="ml-auto text-xs text-muted-foreground">총 {days}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">시작일</p>
                  <p className="text-foreground">{formatDate(book.started_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">완료일</p>
                  <p className="text-foreground">{formatDate(book.finished_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Memo */}
          {book.memo && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold text-foreground">감상 메모</h4>
              <div className="rounded-xl bg-muted/50 border border-border p-4">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {book.memo}
                </p>
              </div>
            </div>
          )}

          {!book.memo && !book.started_at && !book.finished_at && (
            <p className="text-sm text-muted-foreground text-center py-6">
              아직 기록이 없습니다.
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-border shrink-0">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground">
                <span className="font-medium">{book.title}</span> 을(를) 삭제할까요? 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmingDelete(false)}
                >
                  취소
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => onDelete(book.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제 확인
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => onEdit(book)}
              >
                <Pencil className="w-4 h-4" />
                수정
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
