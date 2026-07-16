'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Book, BookFormData } from './types'
import { getBooksRepository, localBooksRepository } from './books-repository'

export interface UseBooksResult {
  books: Book[]
  /** True until the initial load from the store finishes. */
  loading: boolean
  /** True when the Supabase load failed and we're running on localStorage. */
  usingLocalFallback: boolean
  addBook: (data: BookFormData) => Promise<void>
  updateBook: (id: string, data: BookFormData) => Promise<void>
  deleteBook: (id: string) => Promise<void>
}

/**
 * Loads books from the active repository and exposes CRUD operations.
 *
 * If the primary store (Supabase) fails on the initial load — most commonly
 * because the `books` table hasn't been created yet — we transparently switch
 * the active repository to localStorage for the rest of the session so the app
 * stays fully functional. Writes always go through whichever repository is live.
 */
export function useBooks(): UseBooksResult {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [usingLocalFallback, setUsingLocalFallback] = useState(false)
  const repoRef = useRef(getBooksRepository())

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const loaded = await repoRef.current.getAll()
        if (active) setBooks(loaded)
      } catch (err) {
        console.warn('[books] primary store unavailable — falling back to local storage.', err)
        repoRef.current = localBooksRepository
        if (active) setUsingLocalFallback(true)
        try {
          const loaded = await localBooksRepository.getAll()
          if (active) setBooks(loaded)
        } catch {
          /* ignore — leave books empty */
        }
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const addBook = useCallback(async (data: BookFormData) => {
    const created = await repoRef.current.create(data)
    setBooks((prev) => [created, ...prev])
  }, [])

  const updateBook = useCallback(async (id: string, data: BookFormData) => {
    const updated = await repoRef.current.update(id, data)
    setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)))
  }, [])

  const deleteBook = useCallback(async (id: string) => {
    await repoRef.current.remove(id)
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return { books, loading, usingLocalFallback, addBook, updateBook, deleteBook }
}
