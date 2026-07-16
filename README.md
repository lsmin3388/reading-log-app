# 내 책장 — Reading Log

읽은 책을 기록하고 별점·메모를 남기는 개인 독서 노트. **Three.js 3D 히어로**와
**토스 + 애플** 감성의 UI로 만들었습니다.

## 스택

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · Base UI · lucide-react
- **three / @react-three/fiber / drei** — 떠다니는 3D 책 + 이리데센트 코어
- **Supabase** 영속성 (미설정 시 localStorage로 자동 폴백)

## 개발

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 프로덕션 빌드
pnpm exec tsc --noEmit   # 타입 검사
```

## 데이터 저장

데이터 접근은 전부 `lib/books-repository.ts`의 `BooksRepository` 인터페이스를 거칩니다.

- Supabase 설정이 있으면 → `SupabaseBooksRepository`
- 없거나 초기 로드 실패 시 → localStorage 폴백

Supabase 테이블 생성 및 환경변수 설정은 [`SUPABASE.md`](./SUPABASE.md) 참고.

## 배포 / CI-CD

- `/.github/workflows/ci.yml` — 푸시·PR마다 타입검사 + 빌드
- `/.github/workflows/deploy.yml` — main 푸시 시 Vercel 프로덕션 배포
  (`VERCEL_TOKEN` 시크릿이 있으면 활성화, 없으면 스킵)
