# Card Game

Next.js 16 + React 19 기반의 카드 배틀 게임입니다. 카드 목록, 랭킹, 인벤토리는 Supabase와 연동되며, Supabase 환경 변수가 없으면 fallback 데이터로도 실행됩니다.

## Gameplay

- `일반전`: 두 카드가 자동 전투를 진행합니다.
- `랭크전`: 서버가 매치 결과와 점수 변화를 계산하고 랭킹에 반영합니다.
- `카드`: 실제 제출 이미지 기반 카드 목록과 보유 수량을 보여줍니다.
- `가챠`: 1장, 10장, 100장 뽑기를 서버 API로 요청하고 인벤토리를 동기화합니다.
- `순위`: Supabase 랭킹 데이터를 점수순으로 표시합니다.

## Tech Stack

- Next.js 16.2.7 App Router
- React 19.2
- TypeScript
- Supabase
- Tailwind CSS 4
- Node test runner + `tsx`
- pnpm

## Folder Structure

```text
src/
  app/
    api/
      inventory/draws/route.ts  # 서버 소유 가챠 뽑기 API
      matches/route.ts          # 서버 소유 매치 기록 API
    page.tsx                    # 화면 조합과 라우팅만 담당하는 coordinator
    globals.css                 # 전역 게임 스타일
  components/game/
    PlayingCard.tsx             # 카드 UI
    Sparkles.tsx                # 배경 효과
    screens/                    # 홈, 전투, 매칭, 카드, 가챠, 랭킹 화면
  hooks/
    useBattleFlow.ts            # 매칭, 전투 loop, 서버 매치 기록
    useGachaFlow.ts             # 서버 가챠 요청과 카드 등장 animation
    useGameData.ts              # 초기 카드/랭킹/인벤토리 로드
  lib/
    game/
      backend.ts                # 브라우저 API helper와 public Supabase read
      battle.ts                 # 전투 상태 helper
      cards.ts                  # 카드 row 매핑과 fallback 카드
      inventory.ts              # 인벤토리 검증, 병합, 서버 draw helper
      matches.ts                # 매치 요청 검증과 서버 결과 계산
      server-backend.ts         # 서버 전용 Supabase write/RPC logic
    supabase/
      client.ts                 # 브라우저용 Supabase client
      server.ts                 # 서버용 Supabase client
supabase/
  migrations/                   # DB schema, RLS, grants, RPC
  seed.sql                      # Local seed data
public/cards/                   # Card image assets
docs/superpowers/               # Spec and implementation plans
```

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values when using Supabase.

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-local-or-production-publishable-key
SUPABASE_SECRET_KEY=replace-with-server-only-secret-key
```

`NEXT_PUBLIC_*` values are bundled into the browser. Never put a service role key or server secret in a `NEXT_PUBLIC_*` variable. Server-side writes use `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase

Start the local Supabase stack:

```bash
pnpm supabase:start
```

Apply migrations:

```bash
pnpm exec supabase migration up
```

Reset and seed local data:

```bash
pnpm exec supabase db reset
```

## Database Model

- `game_cards`: public card catalog. Public clients can read rows.
- `game_rankings`: public ranking board. Public clients can read rows, but browser clients cannot update scores directly.
- `game_matches`: server-written match history. Public clients cannot insert rows directly.
- `game_inventory`: inventory quantities. Public clients can read the demo inventory, but cannot update it directly.
- `increment_game_inventory`: RPC executable only by the server/service role. It increments inventory for server-generated draw results.

RLS is enabled on every game table in the exposed `public` schema. The migrations revoke browser write grants for rankings, matches, and inventory-changing RPC calls.

## Security Model

- Match API requests only include `mode`, `playerCardId`, and `enemyCardId`.
- The browser cannot submit `result` or `scoreDelta`; those are calculated on the server in `src/lib/game/matches.ts`.
- Gacha API requests only include a draw `count` of `1`, `10`, or `100`.
- The browser cannot submit selected card IDs for gacha; the server draws cards and persists those IDs.
- Supabase secret keys stay server-only through `src/lib/supabase/server.ts`.
- Route handlers return generic failure responses and do not expose internal Supabase errors.

Remaining production hardening would require authentication, per-user inventory rows, rate limiting, and user-specific RLS policies. This demo keeps a shared game state.

## Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # ESLint
pnpm test     # Node test runner
```

## Verification

Run these before submitting changes:

```bash
pnpm test
pnpm lint
pnpm build
```

When running inside a nested git worktree, Next.js may warn about multiple lockfiles and workspace root inference. The build is still valid when it finishes successfully.

## Git Convention

Use Conventional Commit style summaries and include a body for non-trivial changes.

```text
feat: harden game APIs and split UI architecture

Move match and gacha outcomes to server-owned logic so callers cannot submit
ranked wins or selected card IDs directly.

Verified with pnpm test, pnpm lint, and pnpm build.
```

Good commit messages should explain:

- what changed
- why it changed
- which verification commands passed
