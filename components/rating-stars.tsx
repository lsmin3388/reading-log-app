'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
}

export function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 'md',
  className,
}: RatingStarsProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const displayValue = hovered ?? value

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, star: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = x < rect.width / 2
    setHovered(half ? star - 0.5 : star)
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>, star: number) {
    if (!onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const half = x < rect.width / 2
    onChange(half ? star - 0.5 : star)
  }

  if (readonly) {
    return (
      <span className={cn('flex items-center gap-0.5', className)} aria-label={`별점 ${value}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarSvg
            key={star}
            fill={displayValue >= star ? 'full' : displayValue >= star - 0.5 ? 'half' : 'empty'}
            sizeClass={SIZES[size]}
          />
        ))}
      </span>
    )
  }

  return (
    <span
      className={cn('flex items-center gap-0.5', className)}
      onMouseLeave={() => setHovered(null)}
      role="group"
      aria-label="별점 선택"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`별점 ${star}`}
          className="cursor-pointer focus-visible:outline-none"
          onMouseMove={(e) => handleMouseMove(e, star)}
          onClick={(e) => handleClick(e, star)}
        >
          <StarSvg
            fill={displayValue >= star ? 'full' : displayValue >= star - 0.5 ? 'half' : 'empty'}
            sizeClass={SIZES[size]}
          />
        </button>
      ))}
    </span>
  )
}

function StarSvg({
  fill,
  sizeClass,
}: {
  fill: 'full' | 'half' | 'empty'
  sizeClass: string
}) {
  const id = useId()

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(sizeClass)}
      aria-hidden="true"
    >
      {fill === 'half' && (
        <defs>
          <linearGradient id={`half-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="var(--star-fill)" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z"
        fill={
          fill === 'full'
            ? 'var(--star-fill)'
            : fill === 'half'
            ? `url(#half-${id})`
            : 'transparent'
        }
        stroke="var(--star-fill)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}
