export type BookStatus = 'reading' | 'completed' | 'want_to_read'

export interface Book {
  id: string
  title: string
  author: string
  cover_url: string | null
  status: BookStatus
  rating: number // 0–5, 0.5 increments
  memo: string
  started_at: string | null  // ISO date string
  finished_at: string | null // ISO date string
  created_at: string         // ISO date string
}

export type BookFormData = Omit<Book, 'id' | 'created_at'>

export const STATUS_LABELS: Record<BookStatus, string> = {
  reading: '읽는 중',
  completed: '다 읽음',
  want_to_read: '읽고 싶음',
}

export const STATUS_FILTER_TABS = [
  { value: 'all', label: '전체' },
  { value: 'reading', label: '읽는 중' },
  { value: 'completed', label: '다 읽음' },
  { value: 'want_to_read', label: '읽고 싶음' },
] as const

export type FilterTab = (typeof STATUS_FILTER_TABS)[number]['value']
