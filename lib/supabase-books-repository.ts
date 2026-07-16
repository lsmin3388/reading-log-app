import type { BooksRepository } from './books-repository'
import type { Book, BookFormData } from './types'
import { getSupabase } from './supabase-client'

/** PostgREST can return `numeric` as a string — normalise it back to a number. */
function normalize(row: Record<string, unknown>): Book {
  const book = row as unknown as Book
  return { ...book, rating: Number(book.rating) }
}

/**
 * Supabase-backed store. Implements the exact same {@link BooksRepository}
 * contract as the local one, so the app swaps between them with zero changes to
 * hooks or components. Every method throws on error; the caller (`useBooks`)
 * catches a failed initial load and falls back to local storage — which means
 * the app keeps working even before the `books` table has been created.
 */
export class SupabaseBooksRepository implements BooksRepository {
  private get db() {
    const client = getSupabase()
    if (!client) throw new Error('Supabase is not configured')
    return client
  }

  async getAll(): Promise<Book[]> {
    const { data, error } = await this.db
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(normalize)
  }

  async create(input: BookFormData): Promise<Book> {
    const { data, error } = await this.db
      .from('books')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return normalize(data)
  }

  async update(id: string, input: BookFormData): Promise<Book> {
    const { data, error } = await this.db
      .from('books')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return normalize(data)
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('books').delete().eq('id', id)
    if (error) throw error
  }
}
