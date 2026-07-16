# Supabase 연동 상태

이 앱은 **이미 Supabase에 연결되어 있습니다.** (`lib/supabase-client.ts`,
`lib/supabase-books-repository.ts`) 남은 단 하나의 수동 단계는 **`books` 테이블 생성**입니다.
테이블이 없으면 앱은 자동으로 localStorage로 폴백하므로 사이트가 깨지지 않습니다 —
아래 SQL을 실행하는 순간부터 Supabase에 영속 저장됩니다.

## 1. 테이블 생성 (Supabase 대시보드 → SQL Editor에 붙여넣고 Run)

```sql
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text not null,
  cover_url   text,
  status      text not null default 'want_to_read'
              check (status in ('reading', 'completed', 'want_to_read')),
  rating      numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  memo        text not null default '',
  started_at  date,
  finished_at date,
  created_at  date not null default current_date
);

-- 이 앱은 로그인이 없으므로 anon(publishable) 키에 CRUD를 허용합니다.
alter table public.books enable row level security;
create policy "anon read"   on public.books for select using (true);
create policy "anon insert" on public.books for insert with check (true);
create policy "anon update" on public.books for update using (true) with check (true);
create policy "anon delete" on public.books for delete using (true);
```

> ⚠️ 위 정책은 익명 사용자에게 전체 읽기/쓰기를 엽니다(개인 데모용). 공개 서비스로
> 쓸 거라면 Supabase Auth를 붙이고 `user_id = auth.uid()` 기반 RLS로 바꾸세요.

## 2. 환경변수

- 로컬: `.env.local` (이미 작성됨, gitignored)
- Vercel: 프로젝트 → Settings → Environment Variables 에 아래 두 개 추가하면
  내장 기본값을 덮어씁니다. (publishable 키는 공개 안전 키라 미설정이어도 동작)

```
NEXT_PUBLIC_SUPABASE_URL=https://kresglhdqefvprebmhsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_EsDfmPqbbrpEqu4UsvxeHA_kvCYSLZz
```

## 동작 방식

- `getBooksRepository()` — Supabase 설정이 있으면 `SupabaseBooksRepository`, 없으면 로컬.
- `useBooks()` — Supabase 초기 로드 실패 시(테이블 미생성 등) 자동으로 localStorage로 폴백.
- `BooksRepository` 인터페이스 하나로 추상화되어 있어 컴포넌트/훅은 저장소를 몰라도 됩니다.
