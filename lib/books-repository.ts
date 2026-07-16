import type { Book, BookFormData } from './types'
import { MOCK_BOOKS } from './mock-data'
import { hasSupabaseConfig } from './supabase-client'
import { SupabaseBooksRepository } from './supabase-books-repository'

/**
 * Storage abstraction for books.
 *
 * The whole app talks to this async interface — never to localStorage or
 * Supabase directly. That means swapping the backing store is a one-line
 * change in `getBooksRepository()` below; no component or hook has to change.
 *
 * All methods are async on purpose: the local implementation resolves
 * immediately, but a network-backed one (Supabase) drops in without touching
 * any call site.
 */
export interface BooksRepository {
  getAll(): Promise<Book[]>
  create(data: BookFormData): Promise<Book>
  update(id: string, data: BookFormData): Promise<Book>
  remove(id: string): Promise<void>
}

const STORAGE_KEY = 'reading-log:books:v1'

function generateId(): string {
  // crypto.randomUUID is available in all modern browsers; fall back for
  // older/SSR environments.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function todayISODate(): string {
  return new Date().toISOString().split('T')[0]
}

/** Newest first — keeps grids and lists stable regardless of the store. */
function sortByCreated(books: Book[]): Book[] {
  return [...books].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/**
 * localStorage-backed repository.
 *
 * SSR-safe: on the server (`window` undefined) every read returns the seed
 * data and every write is a no-op, so the first client render matches the
 * server render and there's no hydration mismatch. The real data is loaded in
 * a `useEffect` on the client (see `useBooks`).
 */
class LocalBooksRepository implements BooksRepository {
  private read(): Book[] {
    if (typeof window === 'undefined') return sortByCreated(MOCK_BOOKS)
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) {
        // First run on this device — seed with the sample library so the app
        // isn't empty, and persist it so edits stick.
        this.write(MOCK_BOOKS)
        return sortByCreated(MOCK_BOOKS)
      }
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return sortByCreated(MOCK_BOOKS)
      return sortByCreated(parsed as Book[])
    } catch {
      // Corrupt JSON or storage blocked (private mode) — fall back to seed.
      return sortByCreated(MOCK_BOOKS)
    }
  }

  private write(books: Book[]): void {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
    } catch {
      // Storage full or blocked — ignore; state stays in memory for the session.
    }
  }

  async getAll(): Promise<Book[]> {
    return this.read()
  }

  async create(data: BookFormData): Promise<Book> {
    const book: Book = {
      ...data,
      id: generateId(),
      created_at: todayISODate(),
    }
    this.write([book, ...this.read()])
    return book
  }

  async update(id: string, data: BookFormData): Promise<Book> {
    const books = this.read()
    const existing = books.find((b) => b.id === id)
    if (!existing) throw new Error(`Book not found: ${id}`)
    const updated: Book = { ...existing, ...data }
    this.write(books.map((b) => (b.id === id ? updated : b)))
    return updated
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((b) => b.id !== id))
  }
}

export const localBooksRepository = new LocalBooksRepository()

let supabaseRepository: BooksRepository | null = null

/**
 * Returns the active repository: Supabase when configured, else localStorage.
 *
 * `useBooks` additionally falls back to {@link localBooksRepository} at runtime
 * if the Supabase load fails (e.g. the `books` table hasn't been created yet),
 * so the app is always usable. See `SUPABASE.md` for the table schema.
 */
export function getBooksRepository(): BooksRepository {
  if (hasSupabaseConfig) {
    if (!supabaseRepository) supabaseRepository = new SupabaseBooksRepository()
    return supabaseRepository
  }
  return localBooksRepository
}
