'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RatingStars } from './rating-stars'
import type { Book, BookFormData, BookStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: BookFormData) => void | Promise<void>
  initialData?: Book | null
}

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'reading', label: '읽는 중' },
  { value: 'completed', label: '다 읽음' },
  { value: 'want_to_read', label: '읽고 싶음' },
]

function emptyForm(): BookFormData {
  return {
    title: '',
    author: '',
    cover_url: null,
    status: 'want_to_read',
    rating: 0,
    memo: '',
    started_at: null,
    finished_at: null,
  }
}

function bookToFormData(book: Book): BookFormData {
  return {
    title: book.title,
    author: book.author,
    cover_url: book.cover_url,
    status: book.status,
    rating: book.rating,
    memo: book.memo,
    started_at: book.started_at,
    finished_at: book.finished_at,
  }
}

export function BookForm({ open, onClose, onSave, initialData }: BookFormProps) {
  const [form, setForm] = useState<BookFormData>(emptyForm)
  const [errors, setErrors] = useState<Partial<Record<keyof BookFormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // Sync the form to the incoming data whenever the dialog opens. A controlled
  // `open` prop does not trigger the dialog's onOpenChange, so this effect —
  // not the dialog callback — is what resets the fields for each open.
  useEffect(() => {
    if (open) {
      setForm(initialData ? bookToFormData(initialData) : emptyForm())
      setErrors({})
      setSubmitting(false)
    }
  }, [open, initialData])

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.title.trim()) next.title = '제목을 입력해주세요.'
    if (!form.author.trim()) next.author = '저자를 입력해주세요.'
    if (
      form.started_at &&
      form.finished_at &&
      form.finished_at < form.started_at
    ) {
      next.finished_at = '완료일은 시작일보다 빠를 수 없습니다.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        author: form.author.trim(),
      })
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-foreground">
            {initialData ? '책 수정' : '책 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-medium text-foreground">
              제목 <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              placeholder="책 제목을 입력하세요"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              aria-invalid={!!errors.title}
              className={cn(errors.title && 'border-destructive')}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          {/* Author */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="author" className="text-sm font-medium text-foreground">
              저자 <span className="text-destructive">*</span>
            </label>
            <Input
              id="author"
              placeholder="저자명을 입력하세요"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              aria-invalid={!!errors.author}
              className={cn(errors.author && 'border-destructive')}
            />
            {errors.author && <p className="text-xs text-destructive">{errors.author}</p>}
          </div>

          {/* Cover URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cover_url" className="text-sm font-medium text-foreground">
              표지 이미지 URL
            </label>
            <Input
              id="cover_url"
              type="url"
              inputMode="url"
              placeholder="https://..."
              value={form.cover_url ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, cover_url: e.target.value || null }))
              }
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">상태</span>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={form.status === opt.value}
                  onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    form.status === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary text-secondary-foreground border-border hover:bg-accent',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">별점</span>
            <div className="flex items-center gap-3">
              <RatingStars
                value={form.rating}
                onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                size="lg"
              />
              {form.rating > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{form.rating} / 5</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rating: 0 }))}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    초기화
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Memo */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="memo" className="text-sm font-medium text-foreground">
              감상 메모
            </label>
            <Textarea
              id="memo"
              placeholder="이 책에 대한 감상을 자유롭게 적어보세요..."
              rows={4}
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              className="resize-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="started_at" className="text-sm font-medium text-foreground">
                시작일
              </label>
              <Input
                id="started_at"
                type="date"
                value={form.started_at ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, started_at: e.target.value || null }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="finished_at" className="text-sm font-medium text-foreground">
                완료일
              </label>
              <Input
                id="finished_at"
                type="date"
                value={form.finished_at ?? ''}
                min={form.started_at ?? undefined}
                aria-invalid={!!errors.finished_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, finished_at: e.target.value || null }))
                }
                className={cn(errors.finished_at && 'border-destructive')}
              />
              {errors.finished_at && (
                <p className="text-xs text-destructive">{errors.finished_at}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitting ? '저장 중…' : initialData ? '수정 완료' : '추가하기'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
