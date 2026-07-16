'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { RatingStars } from './rating-stars'
import { STATUS_LABELS } from '@/lib/types'
import type { Book } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BookCardProps {
  book: Book
  onClick: (book: Book) => void
}

const STATUS_BADGE_STYLES = {
  reading: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-accent text-accent-foreground border-border',
  want_to_read: 'bg-muted text-muted-foreground border-border',
}

function BookCardComponent({ book, onClick }: BookCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = book.cover_url && !imageFailed

  return (
    <button
      type="button"
      onClick={() => onClick(book)}
      className={cn(
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'bg-card border border-border/70',
        'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.05)]',
        'hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_34px_rgba(0,0,0,0.10)]',
        'transition-all duration-300 ease-out hover:-translate-y-1',
        'text-left w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={`${book.title} — ${book.author}`}
    >
      {/* Cover */}
      <div className="relative w-full aspect-[2/3] bg-muted overflow-hidden">
        {showImage ? (
          <Image
            src={book.cover_url as string}
            alt={`${book.title} 표지`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Status badge overlay */}
        <span
          className={cn(
            'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium border',
            STATUS_BADGE_STYLES[book.status],
          )}
        >
          {STATUS_LABELS[book.status]}
        </span>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <h3 className="font-serif text-sm font-semibold leading-tight line-clamp-2 text-card-foreground">
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate">{book.author}</p>
        {book.rating > 0 && (
          <RatingStars value={book.rating} readonly size="sm" className="mt-1" />
        )}
      </div>
    </button>
  )
}

export const BookCard = memo(BookCardComponent)
