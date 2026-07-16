'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, BookOpen } from 'lucide-react'
import { BookCard } from '@/components/book-card'
import { BookForm } from '@/components/book-form'
import { BookDetail } from '@/components/book-detail'
import { StatsPanel } from '@/components/stats-panel'
import { ReadingHero } from '@/components/reading-hero'
import { useBooks } from '@/lib/use-books'
import { STATUS_FILTER_TABS } from '@/lib/types'
import type { Book, BookFormData, FilterTab } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function BookshelfPage() {
  const { books, loading, addBook, updateBook, deleteBook } = useBooks()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const filteredBooks = useMemo(() => {
    let result = books
    if (activeFilter !== 'all') {
      result = result.filter((b) => b.status === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      )
    }
    return result
  }, [books, activeFilter, searchQuery])

  const handleAddBook = useCallback(() => {
    setEditingBook(null)
    setFormOpen(true)
  }, [])

  const handleEditBook = useCallback((book: Book) => {
    setSelectedBook(null)
    setEditingBook(book)
    setFormOpen(true)
  }, [])

  const handleSave = useCallback(
    async (data: BookFormData) => {
      if (editingBook) {
        await updateBook(editingBook.id, data)
      } else {
        await addBook(data)
      }
    },
    [editingBook, updateBook, addBook],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBook(id)
      setSelectedBook(null)
    },
    [deleteBook],
  )

  const handleSelectBook = useCallback((book: Book) => {
    setSelectedBook(book)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-[22px] h-[22px] text-primary" />
            <h1 className="text-[19px] font-semibold text-foreground tracking-tight">
              내 책장
            </h1>
          </div>
          <button
            type="button"
            onClick={handleAddBook}
            className={cn(
              'hidden sm:flex items-center gap-1.5 pl-3.5 pr-4 py-2 rounded-full text-sm font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97]',
              'transition-all duration-150 shadow-sm',
            )}
            aria-label="책 추가"
          >
            <Plus className="w-4 h-4" />
            책 추가
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* 3D hero */}
        <ReadingHero books={books} onAddBook={handleAddBook} />

        {/* Stats */}
        <StatsPanel books={books} />

        {/* Search + Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter — Apple segmented control */}
          <nav
            className="inline-flex items-center gap-0.5 p-1 rounded-full bg-secondary max-w-full overflow-x-auto"
            role="tablist"
            aria-label="독서 상태 필터"
          >
            {STATUS_FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeFilter === tab.value}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200',
                  activeFilter === tab.value
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="제목 또는 저자 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="제목 또는 저자 검색"
              className={cn(
                'w-full pl-10 pr-3.5 py-2 text-sm rounded-full transition-colors',
                'bg-secondary border border-transparent text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:bg-card focus:border-border focus:ring-2 focus:ring-ring/30',
              )}
            />
          </div>
        </div>

        {/* Book grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBooks.map((book, i) => (
              <div
                key={book.id}
                className="animate-rise"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <BookCard book={book} onClick={handleSelectBook} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {searchQuery || activeFilter !== 'all'
                ? '조건에 맞는 책이 없습니다.'
                : '아직 책이 없습니다.'}
            </p>
            {!searchQuery && activeFilter === 'all' && (
              <button
                type="button"
                onClick={handleAddBook}
                className="text-sm text-primary underline underline-offset-4"
              >
                첫 번째 책을 추가해보세요
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Add Button (mobile) */}
      <button
        type="button"
        onClick={handleAddBook}
        className={cn(
          'sm:hidden fixed bottom-6 right-6 z-30',
          'w-14 h-14 rounded-full flex items-center justify-center shadow-lg',
          'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label="책 추가"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Book Form Modal */}
      <BookForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingBook}
      />

      {/* Book Detail Side Panel */}
      <BookDetail
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onEdit={handleEditBook}
        onDelete={handleDelete}
      />
    </div>
  )
}

function BookCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-card border border-border shadow-sm">
      <div className="w-full aspect-[2/3] bg-muted animate-pulse" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
