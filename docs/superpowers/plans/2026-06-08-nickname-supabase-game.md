# Nickname Supabase Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build nickname-based Supabase persistence for player login, inventory, rankings, ranked matches, and longer high-intensity game animations.

**Architecture:** Add a `game_players` source of truth, make inventory and matches player-scoped, and keep writes server-owned through Next.js route handlers. Client state starts from a nickname session, then all gameplay hooks pass the active nickname to server APIs and render active-player rankings/inventory.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS 4, GSAP, Node test runner with `tsx`.

---

## File Structure

- Create `src/lib/game/player.ts`: nickname validation, player session types, player row mapping, ranking row mapping.
- Create `src/lib/game/player.test.ts`: unit tests for nickname validation and player/ranking mapping.
- Create `src/app/api/player/session/route.ts`: session API handler for nickname upsert/fetch.
- Create `src/app/api/player/session/route.test.ts`: handler tests with injected persistence.
- Modify `src/lib/game/inventory.ts`: add nickname-aware draw input and keep inventory row mapping focused on card counts.
- Modify `src/lib/game/inventory.test.ts`: add nickname payload tests.
- Modify `src/lib/game/matches.ts`: add nickname to match request parsing while retaining server-owned result/score behavior.
- Modify `src/lib/game/matches.test.ts`: add nickname payload and caller-controlled field tests.
- Modify `src/lib/game/server-backend.ts`: resolve players, scope inventory/matches, update score, return refreshed ranking/player data.
- Modify `src/lib/game/server-backend.test.ts`: test per-player inventory RPC args and player-scoped ranked score update.
- Modify `src/lib/game/backend.ts`: client helpers for session, player-scoped initial data, nickname-aware draw/match calls.
- Modify `src/lib/game/backend.test.ts`: test request bodies and fallback/session behavior.
- Modify `src/app/api/inventory/draws/route.ts` and test: accept nickname-aware draw payload.
- Modify `src/app/api/matches/route.ts` and test: accept nickname-aware match payload and return score/rank data.
- Modify `supabase/migrations/*`: create a new migration with Supabase CLI for player-backed state and RPC changes.
- Modify `supabase/seed.sql`: seed catalog and ranking players into `game_players`.
- Modify `src/hooks/useGameData.ts`, `src/hooks/useGachaFlow.ts`, `src/hooks/useBattleFlow.ts`: require active session and pass nickname.
- Modify `src/app/page.tsx`: login/session orchestration and logout.
- Create `src/components/game/screens/LoginScreen.tsx`: nickname-only login UI.
- Modify `src/components/game/screens/HomeScreen.tsx`, `RankingScreen.tsx`, `CardsScreen.tsx`, `BattleScreen.tsx`, `GachaScreen.tsx`: active nickname/score display and animation markup hooks.
- Modify `src/lib/game/animation.ts` and `animation.test.ts`: reveal timing helper and longer effect constants.
- Modify `src/app/globals.css`: stronger/slower animations and reduced-motion branch.

---

### Task 1: Player Domain Types And Validation

**Files:**
- Create: `src/lib/game/player.ts`
- Create: `src/lib/game/player.test.ts`

- [ ] **Step 1: Write failing player validation tests**

Create `src/lib/game/player.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapPlayerRow, mapRankingPlayerRow, parseNickname, parsePlayerSessionInput, sortRankingRows } from "./player";

describe("parseNickname", () => {
  it("trims and accepts nickname account identifiers", () => {
    assert.equal(parseNickname("  junhu  "), "junhu");
    assert.equal(parseNickname("배준후 7"), "배준후 7");
    assert.equal(parseNickname("neo-card_99"), "neo-card_99");
  });

  it("rejects empty, too short, too long, and unsafe nicknames", () => {
    assert.throws(() => parseNickname(""), /nickname/i);
    assert.throws(() => parseNickname("a"), /nickname/i);
    assert.throws(() => parseNickname("a".repeat(17)), /nickname/i);
    assert.throws(() => parseNickname("admin<script>"), /nickname/i);
  });
});

describe("parsePlayerSessionInput", () => {
  it("returns a normalized nickname from request payloads", () => {
    assert.deepEqual(parsePlayerSessionInput({ nickname: "  player one " }), { nickname: "player one" });
  });

  it("rejects missing nickname payloads", () => {
    assert.throws(() => parsePlayerSessionInput({}), /nickname/i);
    assert.throws(() => parsePlayerSessionInput(null), /nickname/i);
  });
});

describe("player row mapping", () => {
  it("maps player rows and ranking rows", () => {
    assert.deepEqual(mapPlayerRow({ id: 12, nickname: "junhu", score: 1025 }), { id: 12, nickname: "junhu", score: 1025 });
    assert.deepEqual(mapRankingPlayerRow({ id: 12, nickname: "junhu", score: 1025 }, 2, 12), {
      id: 12,
      nickname: "junhu",
      score: 1025,
      place: 2,
      isActivePlayer: true,
    });
  });

  it("sorts ranking rows by score descending", () => {
    const rows = sortRankingRows([
      { id: 1, nickname: "low", score: 900 },
      { id: 2, nickname: "high", score: 1200 },
    ], 1);

    assert.deepEqual(rows, [
      { id: 2, nickname: "high", score: 1200, place: 1, isActivePlayer: false },
      { id: 1, nickname: "low", score: 900, place: 2, isActivePlayer: true },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/game/player.test.ts`

Expected: FAIL with module resolution error for `./player`.

- [ ] **Step 3: Implement player domain helpers**

Create `src/lib/game/player.ts`:

```ts
export type PlayerSession = {
  id: number;
  nickname: string;
  score: number;
};

export type PlayerRow = {
  id: number;
  nickname: string;
  score: number;
};

export type RankingPlayerRow = PlayerRow;

export type RankingEntry = PlayerSession & {
  place: number;
  isActivePlayer: boolean;
};

const nicknamePattern = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ _.-]+$/u;

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`Player requires a valid ${label}`);
  }
}

export function parseNickname(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Player session requires a valid nickname");
  }

  const nickname = value.trim().replace(/\s+/g, " ");
  if (nickname.length < 2 || nickname.length > 16 || !nicknamePattern.test(nickname)) {
    throw new Error("Player session requires a valid nickname");
  }

  return nickname;
}

export function parsePlayerSessionInput(input: unknown): { nickname: string } {
  if (!input || typeof input !== "object" || !("nickname" in input)) {
    throw new Error("Player session requires a valid nickname");
  }

  return { nickname: parseNickname((input as { nickname: unknown }).nickname) };
}

export function mapPlayerRow(row: PlayerRow): PlayerSession {
  assertPositiveInteger(row.id, "player id");
  const nickname = parseNickname(row.nickname);

  if (!Number.isInteger(row.score) || row.score < 0) {
    throw new Error("Player requires a valid score");
  }

  return { id: row.id, nickname, score: row.score };
}

export function mapRankingPlayerRow(row: RankingPlayerRow, place: number, activePlayerId: number): RankingEntry {
  return {
    ...mapPlayerRow(row),
    place,
    isActivePlayer: row.id === activePlayerId,
  };
}

export function sortRankingRows(rows: RankingPlayerRow[], activePlayerId: number): RankingEntry[] {
  return [...rows]
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
    .map((row, index) => mapRankingPlayerRow(row, index + 1, activePlayerId));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/game/player.test.ts`

Expected: PASS for all `player` tests.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/lib/game/player.ts src/lib/game/player.test.ts
git commit -m "feat: add nickname player domain helpers"
```

Expected: commit succeeds.

---

### Task 2: Nickname-Aware Request Parsing

**Files:**
- Modify: `src/lib/game/inventory.ts`
- Modify: `src/lib/game/inventory.test.ts`
- Modify: `src/lib/game/matches.ts`
- Modify: `src/lib/game/matches.test.ts`

- [ ] **Step 1: Add failing nickname payload tests**

Append to `src/lib/game/inventory.test.ts`:

```ts
describe("parseDrawInventoryInput nickname", () => {
  it("requires a nickname with the draw count", () => {
    assert.deepEqual(parseDrawInventoryInput({ nickname: "  junhu  ", count: 10 }), { nickname: "junhu", count: 10 });
  });

  it("rejects missing nicknames", () => {
    assert.throws(() => parseDrawInventoryInput({ count: 10 }), /nickname/i);
  });
});
```

Update the existing accepted-count test in `src/lib/game/inventory.test.ts` to include nickname:

```ts
assert.deepEqual(parseDrawInventoryInput({ nickname: "p1", count: 1 }), { nickname: "p1", count: 1 });
assert.deepEqual(parseDrawInventoryInput({ nickname: "p1", count: 10 }), { nickname: "p1", count: 10 });
assert.deepEqual(parseDrawInventoryInput({ nickname: "p1", count: 100 }), { nickname: "p1", count: 100 });
```

Update invalid-count tests to include a valid nickname where count is the only invalid field:

```ts
assert.throws(() => parseDrawInventoryInput({ nickname: "p1", count: 0 }), /count/i);
assert.throws(() => parseDrawInventoryInput({ nickname: "p1", count: 2 }), /count/i);
assert.throws(() => parseDrawInventoryInput({ nickname: "p1", count: 101 }), /count/i);
assert.throws(() => parseDrawInventoryInput({ nickname: "p1", count: "10" }), /count/i);
```

Update `src/lib/game/matches.test.ts` valid request expected values:

```ts
const match = parseMatchRequestInput({
  nickname: "  junhu  ",
  mode: "ranked",
  playerCardId: 1,
  enemyCardId: 2,
});

assert.deepEqual(match, {
  nickname: "junhu",
  mode: "ranked",
  playerCardId: 1,
  enemyCardId: 2,
});
```

Add this test in `parseMatchRequestInput`:

```ts
it("rejects missing nicknames", () => {
  assert.throws(
    () =>
      parseMatchRequestInput({
        mode: "ranked",
        playerCardId: 1,
        enemyCardId: 2,
      }),
    /nickname/i,
  );
});
```

For every existing match parser test payload, include `nickname: "p1"` unless the test specifically checks missing nickname.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/lib/game/inventory.test.ts src/lib/game/matches.test.ts`

Expected: FAIL because `parseDrawInventoryInput` and `parseMatchRequestInput` do not return or require `nickname`.

- [ ] **Step 3: Update inventory parser**

Modify `src/lib/game/inventory.ts`:

```ts
import { parseNickname } from "./player";
import type { GameCard } from "./cards";

export type InventoryDrawInput = {
  nickname: string;
  count: 1 | 10 | 100;
};

export function parseDrawInventoryInput(input: unknown): InventoryDrawInput {
  if (!input || typeof input !== "object" || !("count" in input) || !("nickname" in input)) {
    throw new Error("Draw payload requires a valid nickname and count");
  }

  const value = input as { nickname: unknown; count: unknown };
  const count = value.count;
  if (typeof count !== "number" || !Number.isInteger(count) || !allowedDrawCounts.has(count)) {
    throw new Error("Draw payload requires a valid count");
  }

  return { nickname: parseNickname(value.nickname), count: count as InventoryDrawInput["count"] };
}
```

Keep the existing `InventoryEntry`, `InventoryRow`, `mapInventoryRow`, `drawRandomCards`, `mergeInventoryEntries`, and `getInventoryQuantity` logic unchanged.

- [ ] **Step 4: Update match parser**

Modify `src/lib/game/matches.ts`:

```ts
import { parseNickname } from "./player";
import type { GameCard } from "./cards";

export type MatchRequestInput = {
  nickname: string;
  mode: MatchMode;
  playerCardId: number;
  enemyCardId: number;
};

export type PersistableMatchResult = {
  nickname: string;
  mode: MatchMode;
  playerCardId: number;
  enemyCardId: number;
  result: MatchResult;
  scoreDelta: number;
};

export function parseMatchRequestInput(input: unknown): MatchRequestInput {
  if (!input || typeof input !== "object") {
    throw new Error("Match request requires an object payload");
  }

  const value = input as MatchRequestInput & Record<string, unknown>;
  const nickname = parseNickname(value.nickname);

  if (!matchModes.has(value.mode)) {
    throw new Error("Match request requires a valid mode");
  }

  if ("result" in value) {
    throw new Error("Match request result is server controlled");
  }

  if ("scoreDelta" in value) {
    throw new Error("Match request score delta is server controlled");
  }

  assertPositiveInteger(value.playerCardId, "player card id");
  assertPositiveInteger(value.enemyCardId, "enemy card id");

  if (value.playerCardId === value.enemyCardId) {
    throw new Error("Match request requires two different card ids");
  }

  return {
    nickname,
    mode: value.mode,
    playerCardId: value.playerCardId,
    enemyCardId: value.enemyCardId,
  };
}

export function createServerMatchResult(request: MatchRequestInput, cards: GameCard[]): PersistableMatchResult {
  const player = cards.find((card) => card.id === request.playerCardId);
  const enemy = cards.find((card) => card.id === request.enemyCardId);

  if (!player || !enemy) {
    throw new Error("Match request requires known cards");
  }

  const playerPower = cardPower(player);
  const enemyPower = cardPower(enemy);
  const result: MatchResult = playerPower > enemyPower ? "player-win" : enemyPower > playerPower ? "enemy-win" : "draw";

  return {
    ...request,
    result,
    scoreDelta: getRankedScoreDelta({ mode: request.mode, result }),
  };
}
```

- [ ] **Step 5: Run parser tests**

Run: `pnpm test src/lib/game/inventory.test.ts src/lib/game/matches.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/lib/game/inventory.ts src/lib/game/inventory.test.ts src/lib/game/matches.ts src/lib/game/matches.test.ts
git commit -m "feat: require nicknames for game requests"
```

Expected: commit succeeds.

---

### Task 3: Supabase Migration For Player-Owned State

**Files:**
- Create: new migration under `supabase/migrations/` using Supabase CLI
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Check current Supabase CLI and docs**

Run:

```bash
pnpm exec supabase --version
pnpm exec supabase migration --help
```

Expected: CLI prints version and migration commands. If `supabase` is not installed in the local package context, run `pnpm install` first and retry.

- [ ] **Step 2: Create migration file with CLI**

Run:

```bash
pnpm exec supabase migration new nickname_players
```

Expected: a new file appears in `supabase/migrations/` with a timestamp and suffix `nickname_players.sql`.

- [ ] **Step 3: Write migration SQL**

Put this SQL in the new migration file:

```sql
create table if not exists public.game_players (
  id bigint primary key generated always as identity,
  nickname text not null unique check (length(trim(nickname)) between 2 and 16),
  score integer not null default 1000 check (score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.game_players (nickname, score)
select player_name, score
from public.game_rankings
on conflict (nickname)
do update set
  score = excluded.score,
  updated_at = now();

alter table public.game_inventory
  add column if not exists player_id bigint references public.game_players(id) on delete cascade;

with default_player as (
  insert into public.game_players (nickname, score)
  values ('배준후', 1000)
  on conflict (nickname)
  do update set updated_at = now()
  returning id
)
update public.game_inventory
set player_id = (select id from default_player)
where player_id is null;

alter table public.game_inventory
  alter column player_id set not null;

drop index if exists game_inventory_card_id_idx;
alter table public.game_inventory
  drop constraint if exists game_inventory_card_id_key;
alter table public.game_inventory
  add constraint game_inventory_player_card_unique unique (player_id, card_id);

create index if not exists game_inventory_player_id_idx on public.game_inventory(player_id);
create index if not exists game_inventory_player_card_idx on public.game_inventory(player_id, card_id);

alter table public.game_matches
  add column if not exists player_id bigint references public.game_players(id) on delete cascade;

create index if not exists game_matches_player_id_idx on public.game_matches(player_id);

alter table public.game_players enable row level security;

grant select on public.game_players to anon, authenticated;

create policy "public can read game players"
on public.game_players
for select
to anon, authenticated
using (true);

drop function if exists public.increment_game_inventory(bigint[]);

create or replace function public.increment_game_inventory(target_player_id bigint, drawn_card_ids bigint[])
returns table(card_id bigint, quantity integer)
language sql
as $$
  with drawn_cards as (
    select card_id, count(*)::integer as drawn_quantity
    from unnest(drawn_card_ids) as card_id
    group by card_id
  ),
  valid_drawn_cards as (
    select drawn_cards.card_id, drawn_cards.drawn_quantity
    from drawn_cards
    join public.game_cards on game_cards.id = drawn_cards.card_id
  ),
  upserted_inventory as (
    insert into public.game_inventory (player_id, card_id, quantity, updated_at)
    select target_player_id, card_id, drawn_quantity, now()
    from valid_drawn_cards
    on conflict (player_id, card_id)
    do update set
      quantity = game_inventory.quantity + excluded.quantity,
      updated_at = now()
    returning game_inventory.card_id, game_inventory.quantity
  )
  select upserted_inventory.card_id, upserted_inventory.quantity
  from upserted_inventory
  order by upserted_inventory.card_id;
$$;

revoke execute on function public.increment_game_inventory(bigint, bigint[]) from public;
revoke execute on function public.increment_game_inventory(bigint, bigint[]) from anon, authenticated;
grant execute on function public.increment_game_inventory(bigint, bigint[]) to service_role;
```

- [ ] **Step 4: Update seed data**

In `supabase/seed.sql`, add seeded player rows after the `game_rankings` seed block:

```sql
insert into public.game_players (nickname, score)
values
  ('배준후', 1000),
  ('NeonMaster', 1360),
  ('SparkQueen', 1280),
  ('FlashKing', 1195),
  ('CardWizard', 1070)
on conflict (nickname)
do update set
  score = excluded.score,
  updated_at = now();
```

If `seed.sql` already inserts these nicknames elsewhere after implementation, keep one canonical insert block only.

- [ ] **Step 5: Verify migration syntax**

Run:

```bash
pnpm exec supabase db reset
```

Expected: local database resets and applies all migrations without SQL errors. If Docker/Supabase local stack is not running, run `pnpm supabase:start` and retry.

- [ ] **Step 6: Commit**

Run:

```bash
git add supabase/migrations supabase/seed.sql
git commit -m "feat: add player-owned game schema"
```

Expected: commit succeeds.

---

### Task 4: Server Backend Player Persistence

**Files:**
- Modify: `src/lib/game/server-backend.ts`
- Modify: `src/lib/game/server-backend.test.ts`

- [ ] **Step 1: Add failing server backend tests**

In `src/lib/game/server-backend.test.ts`, update imports:

```ts
import { persistInventoryDraw, persistMatchResult, upsertPlayerSession } from "./server-backend";
```

Add tests:

```ts
describe("upsertPlayerSession", () => {
  it("upserts a nickname and maps the player row", async () => {
    const calls: unknown[] = [];
    const client = {
      from(table: string) {
        calls.push(["from", table]);
        return {
          upsert(row: unknown) {
            calls.push(["upsert", row]);
            return {
              select(columns: string) {
                calls.push(["select", columns]);
                return {
                  single() {
                    calls.push(["single"]);
                    return Promise.resolve({ data: { id: 7, nickname: "junhu", score: 1000 }, error: null });
                  },
                };
              },
            };
          },
        };
      },
    };

    const result = await upsertPlayerSession({ client, nickname: "  junhu  " });

    assert.deepEqual(result, { id: 7, nickname: "junhu", score: 1000 });
    assert.deepEqual(calls, [
      ["from", "game_players"],
      ["upsert", { nickname: "junhu" }],
      ["select", "id,nickname,score"],
      ["single"],
    ]);
  });
});

describe("persistInventoryDraw player scope", () => {
  it("passes the resolved player id into the inventory RPC", async () => {
    let rpcArgs: unknown;
    const client = {
      from(table: string) {
        if (table === "game_players") {
          return {
            upsert() {
              return {
                select() {
                  return {
                    single() {
                      return Promise.resolve({ data: { id: 9, nickname: "junhu", score: 1000 }, error: null });
                    },
                  };
                },
              };
            },
          };
        }

        return {
          select() {
            return {
              order() {
                return Promise.resolve({ data: [], error: null });
              },
            };
          },
        };
      },
      rpc(_name: string, args: unknown) {
        rpcArgs = args;
        return Promise.resolve({ data: [{ card_id: 1, quantity: 10 }], error: null });
      },
    };

    const result = await persistInventoryDraw({
      client,
      draw: { nickname: "junhu", count: 1 },
      cards: [{ id: 1, name: "One", rank: "R", attack: 10, hp: 100, imagePath: "/cards/1.png", sortOrder: 1 }],
      random: () => 0,
    });

    assert.equal(result.persisted, true);
    assert.deepEqual(rpcArgs, { target_player_id: 9, drawn_card_ids: [1] });
  });
});
```

Update the existing `persistMatchResult` no-client test expected match to include `nickname: "junhu"` and pass `match: { nickname: "junhu", mode: "ranked", playerCardId: 1, enemyCardId: 2 }`.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/lib/game/server-backend.test.ts`

Expected: FAIL because `upsertPlayerSession` does not exist and backend functions still use shared state.

- [ ] **Step 3: Implement player persistence helpers**

In `src/lib/game/server-backend.ts`, import player helpers:

```ts
import { mapPlayerRow, parseNickname, sortRankingRows, type PlayerRow, type PlayerSession, type RankingEntry } from "./player";
```

Add client types:

```ts
type PlayerQueryClient = Pick<SupabaseClient, "from">;
type RankingResult = {
  player: PlayerSession;
  rankings: RankingEntry[];
};
```

Add:

```ts
export async function upsertPlayerSession({
  client = createServerSupabaseClient(),
  nickname,
}: {
  client?: PlayerQueryClient | null;
  nickname: string;
}): Promise<PlayerSession | null> {
  const normalizedNickname = parseNickname(nickname);

  if (!client) {
    return { id: 1, nickname: normalizedNickname, score: 1000 };
  }

  const response = await client
    .from("game_players")
    .upsert({ nickname: normalizedNickname }, { onConflict: "nickname", ignoreDuplicates: false })
    .select("id,nickname,score")
    .single();

  if (response.error || !response.data) {
    return null;
  }

  return mapPlayerRow(response.data as PlayerRow);
}

async function loadRankings(client: PlayerQueryClient | null, activePlayerId: number): Promise<RankingEntry[]> {
  if (!client) {
    return sortRankingRows([{ id: activePlayerId, nickname: "Player", score: 1000 }], activePlayerId);
  }

  const response = await client.from("game_players").select("id,nickname,score").order("score", { ascending: false }).limit(50);
  if (response.error || !response.data) {
    return [];
  }

  return sortRankingRows(response.data as PlayerRow[], activePlayerId);
}
```

- [ ] **Step 4: Update match persistence**

Change `persistMatchResult` to resolve player and insert/update by `player_id`:

```ts
export async function persistMatchResult({
  client = createServerSupabaseClient(),
  cards,
  match,
}: {
  client?: SupabaseClient | null;
  cards?: GameCard[];
  match: MatchRequestInput;
}): Promise<{ persisted: boolean; match: PersistableMatchResult | null; player: PlayerSession | null; rankings: RankingEntry[] }> {
  const player = await upsertPlayerSession({ client, nickname: match.nickname });
  const persistedMatch = createServerMatchResult(match, await loadServerCards(client, cards));

  if (!client || !player) {
    return { persisted: false, match: persistedMatch, player, rankings: player ? await loadRankings(null, player.id) : [] };
  }

  const insertResponse = await client.from("game_matches").insert({
    player_id: player.id,
    mode: persistedMatch.mode,
    player_card_id: persistedMatch.playerCardId,
    enemy_card_id: persistedMatch.enemyCardId,
    result: persistedMatch.result,
    score_delta: persistedMatch.scoreDelta,
  });

  if (insertResponse.error) {
    return { persisted: false, match: null, player, rankings: [] };
  }

  let currentPlayer = player;
  if (persistedMatch.scoreDelta > 0) {
    const updateResponse = await client
      .from("game_players")
      .update({ score: player.score + persistedMatch.scoreDelta, updated_at: new Date().toISOString() })
      .eq("id", player.id)
      .select("id,nickname,score")
      .single();

    if (updateResponse.error || !updateResponse.data) {
      return { persisted: false, match: null, player, rankings: [] };
    }

    currentPlayer = mapPlayerRow(updateResponse.data as PlayerRow);
  }

  return { persisted: true, match: persistedMatch, player: currentPlayer, rankings: await loadRankings(client, currentPlayer.id) };
}
```

- [ ] **Step 5: Update inventory persistence**

Update the RPC type and `persistInventoryDraw`:

```ts
type InventorySupabaseClient = {
  rpc: (
    name: string,
    args: { target_player_id: number; drawn_card_ids: number[] },
  ) => Promise<{
    data: InventoryRow[] | null;
    error: unknown;
  }>;
};

export async function persistInventoryDraw({
  client = createServerSupabaseClient() as unknown as InventoryPersistenceClient | null,
  cards,
  draw,
  random,
}: {
  client?: InventoryPersistenceClient | null;
  cards?: GameCard[];
  draw: InventoryDrawInput;
  random?: () => number;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[]; player: PlayerSession | null }> {
  const player = await upsertPlayerSession({ client, nickname: draw.nickname });
  const cardClient = client && typeof client.from === "function" ? { from: client.from.bind(client) } : null;
  const drawnCards = drawRandomCards(await loadServerCards(cardClient, cards), draw.count, random);

  if (!client || !player) {
    return { persisted: false, drawnCards, inventory: [], player };
  }

  const response = await client.rpc("increment_game_inventory", { target_player_id: player.id, drawn_card_ids: drawnCards.map((card) => card.id) });
  if (response.error || !response.data) {
    return { persisted: false, drawnCards: [], inventory: [], player };
  }

  return {
    persisted: true,
    drawnCards,
    inventory: response.data.map(mapInventoryRow),
    player,
  };
}
```

- [ ] **Step 6: Run server backend tests**

Run: `pnpm test src/lib/game/server-backend.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/game/server-backend.ts src/lib/game/server-backend.test.ts
git commit -m "feat: persist game state per player"
```

Expected: commit succeeds.

---

### Task 5: API Route Handlers

**Files:**
- Create: `src/app/api/player/session/route.ts`
- Create: `src/app/api/player/session/route.test.ts`
- Modify: `src/app/api/inventory/draws/route.ts`
- Modify: `src/app/api/inventory/draws/route.test.ts`
- Modify: `src/app/api/matches/route.ts`
- Modify: `src/app/api/matches/route.test.ts`

- [ ] **Step 1: Add player session route test**

Create `src/app/api/player/session/route.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handlePlayerSessionPost } from "./route";

describe("handlePlayerSessionPost", () => {
  it("returns an upserted player session", async () => {
    const response = await handlePlayerSessionPost(
      new Request("http://test.local/api/player/session", {
        method: "POST",
        body: JSON.stringify({ nickname: "  junhu  " }),
      }),
      async (nickname) => ({ id: 5, nickname, score: 1000 }),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { id: 5, nickname: "junhu", score: 1000 });
  });

  it("returns 400 for malformed payloads", async () => {
    const response = await handlePlayerSessionPost(
      new Request("http://test.local/api/player/session", {
        method: "POST",
        body: JSON.stringify({ nickname: "<bad>" }),
      }),
      async () => ({ id: 5, nickname: "bad", score: 1000 }),
    );

    assert.equal(response.status, 400);
  });
});
```

- [ ] **Step 2: Update existing route tests for nickname-aware payloads**

In `src/app/api/inventory/draws/route.test.ts`, update valid body to:

```ts
body: JSON.stringify({ nickname: "junhu", count: 10 }),
```

Update injected persist expected input to `{ nickname: "junhu", count: 10 }`.

In `src/app/api/matches/route.test.ts`, update valid body to:

```ts
body: JSON.stringify({ nickname: "junhu", mode: "ranked", playerCardId: 1, enemyCardId: 2 }),
```

Update injected persist expected input to include `nickname: "junhu"`.

- [ ] **Step 3: Run route tests to verify failure**

Run: `pnpm test src/app/api/player/session/route.test.ts src/app/api/inventory/draws/route.test.ts src/app/api/matches/route.test.ts`

Expected: FAIL because player session route is missing and existing handlers do not return new result shapes.

- [ ] **Step 4: Implement player session route**

Create `src/app/api/player/session/route.ts`:

```ts
import { parsePlayerSessionInput, type PlayerSession } from "@/lib/game/player";
import { upsertPlayerSession } from "@/lib/game/server-backend";

type PersistPlayerSession = (nickname: string) => Promise<PlayerSession | null>;

export async function handlePlayerSessionPost(request: Request, persist: PersistPlayerSession = (nickname) => upsertPlayerSession({ nickname })) {
  try {
    const { nickname } = parsePlayerSessionInput(await request.json());
    const player = await persist(nickname);

    if (!player) {
      return Response.json({ error: "Player session unavailable" }, { status: 503 });
    }

    return Response.json(player, { status: 200 });
  } catch {
    return Response.json({ error: "Invalid player session request" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return handlePlayerSessionPost(request);
}
```

- [ ] **Step 5: Update draw and match route response shapes**

In `src/app/api/inventory/draws/route.ts`, keep `parseDrawInventoryInput(await request.json())` and return the result from `persistInventoryDraw`. The success status remains `200` when `result.persisted || result.drawnCards.length > 0`.

In `src/app/api/matches/route.ts`, update response typing to include optional player/rankings:

```ts
type PersistMatch = (match: MatchRequestInput) => Promise<{
  persisted: boolean;
  match: PersistableMatchResult | null;
  player?: unknown;
  rankings?: unknown;
}>;
```

Return:

```ts
return Response.json({ persisted: result.persisted, ...result.match, player: result.player ?? null, rankings: result.rankings ?? [] }, { status: 200 });
```

- [ ] **Step 6: Run route tests**

Run: `pnpm test src/app/api/player/session/route.test.ts src/app/api/inventory/draws/route.test.ts src/app/api/matches/route.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/app/api/player/session/route.ts src/app/api/player/session/route.test.ts src/app/api/inventory/draws/route.ts src/app/api/inventory/draws/route.test.ts src/app/api/matches/route.ts src/app/api/matches/route.test.ts
git commit -m "feat: add nickname game api routes"
```

Expected: commit succeeds.

---

### Task 6: Client Backend Helpers

**Files:**
- Modify: `src/lib/game/backend.ts`
- Modify: `src/lib/game/backend.test.ts`

- [ ] **Step 1: Add failing client helper tests**

In `src/lib/game/backend.test.ts`, import `getPlayerSession`:

```ts
import { getInitialGameData, getPlayerSession, recordInventoryDraw, recordMatchResult } from "./backend";
```

Add:

```ts
describe("getPlayerSession", () => {
  it("posts nickname to the session route", async () => {
    let postedBody: unknown;

    const result = await getPlayerSession({
      nickname: "junhu",
      fetcher: async (_url, init) => {
        postedBody = JSON.parse(String(init?.body));
        return Response.json({ id: 3, nickname: "junhu", score: 1000 });
      },
    });

    assert.deepEqual(result, { id: 3, nickname: "junhu", score: 1000 });
    assert.deepEqual(postedBody, { nickname: "junhu" });
  });

  it("returns null when session creation fails", async () => {
    const result = await getPlayerSession({
      nickname: "bad",
      fetcher: async () => Response.json({ error: "bad" }, { status: 400 }),
    });

    assert.equal(result, null);
  });
});
```

Update the existing `getInitialGameData` fallback test to pass a player:

```ts
const data = await getInitialGameData({ env: {}, player: { id: 1, nickname: "junhu", score: 1000 } });
```

Update the fallback ranking assertion:

```ts
assert.deepEqual(data.rankings, [{ id: 1, nickname: "junhu", score: 1000, place: 1, isActivePlayer: true }]);
```

Update `recordInventoryDraw` test call:

```ts
const result = await recordInventoryDraw({
  fetcher: async (_url, init) => {
    postedBody = JSON.parse(String(init?.body));
    return Response.json({
      persisted: true,
      drawnCards: [fallbackCards[0]],
      inventory: [{ cardId: 1, quantity: 2 }],
    });
  },
  draw: { nickname: "junhu", count: 10 },
});

assert.deepEqual(postedBody, { nickname: "junhu", count: 10 });
```

Update `recordMatchResult` test call and expected posted body to include nickname.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/lib/game/backend.test.ts`

Expected: FAIL because `getPlayerSession` is missing and helper signatures still accept only count/match without nickname.

- [ ] **Step 3: Update backend helper types and session helper**

In `src/lib/game/backend.ts`, import player types:

```ts
import { mapPlayerRow, sortRankingRows, type PlayerRow, type PlayerSession, type RankingEntry } from "./player";
```

Remove the old `RankingEntry` type with `name` and `isPlayer`.

Add:

```ts
export async function getPlayerSession({
  fetcher = fetch,
  nickname,
}: {
  nickname: string;
  fetcher?: typeof fetch;
}): Promise<PlayerSession | null> {
  try {
    const response = await fetcher("/api/player/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname }),
    });

    if (!response.ok) {
      return null;
    }

    return mapPlayerRow((await response.json()) as PlayerRow);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Make initial data player-scoped**

Change `InitialGameData` rankings to `RankingEntry[]`. Change `getInitialGameData` signature:

```ts
export async function getInitialGameData({
  env = getPublicSupabaseEnv(),
  player,
}: {
  env?: PublicSupabaseEnv;
  player: PlayerSession;
}): Promise<InitialGameData> {
```

Fallback return:

```ts
return { cards: fallbackCards, rankings: sortRankingRows([{ id: player.id, nickname: player.nickname, score: player.score }], player.id), inventory: [] };
```

Supabase queries:

```ts
const [cardsResponse, rankingsResponse, inventoryResponse] = await Promise.all([
  supabase.from("game_cards").select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order"),
  supabase.from("game_players").select("id,nickname,score").order("score", { ascending: false }),
  supabase.from("game_inventory").select("card_id,quantity").eq("player_id", player.id).order("card_id"),
]);
```

Mapping:

```ts
const rankings =
  rankingsResponse.error || !rankingsResponse.data?.length
    ? sortRankingRows([{ id: player.id, nickname: player.nickname, score: player.score }], player.id)
    : sortRankingRows(rankingsResponse.data as PlayerRow[], player.id);
```

- [ ] **Step 5: Update record helper signatures**

Change `recordInventoryDraw` to accept `draw`:

```ts
export async function recordInventoryDraw({
  draw,
  fetcher = fetch,
}: {
  draw: InventoryDrawInput;
  fetcher?: typeof fetch;
})
```

Use `body: JSON.stringify(draw)`.

Keep `recordMatchResult` shape but `match` now includes nickname. Parse response `player` and `rankings`:

```ts
return {
  persisted: true,
  match: {
    nickname: data.nickname,
    mode: data.mode,
    playerCardId: data.playerCardId,
    enemyCardId: data.enemyCardId,
    result: data.result,
    scoreDelta: data.scoreDelta,
  },
  player: data.player && typeof data.player === "object" ? mapPlayerRow(data.player as PlayerRow) : null,
  rankings: Array.isArray(data.rankings) ? (data.rankings as RankingEntry[]) : [],
};
```

Update return type to include `player` and `rankings`.

- [ ] **Step 6: Run backend helper tests**

Run: `pnpm test src/lib/game/backend.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/lib/game/backend.ts src/lib/game/backend.test.ts
git commit -m "feat: add player-aware client game helpers"
```

Expected: commit succeeds.

---

### Task 7: Login Screen And Hook Wiring

**Files:**
- Create: `src/components/game/screens/LoginScreen.tsx`
- Modify: `src/hooks/useGameData.ts`
- Modify: `src/hooks/useGachaFlow.ts`
- Modify: `src/hooks/useBattleFlow.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/game/screens/HomeScreen.tsx`
- Modify: `src/components/game/screens/RankingScreen.tsx`

- [ ] **Step 1: Update hooks for required player session**

Modify `src/hooks/useGameData.ts` signature:

```ts
import type { PlayerSession } from "@/lib/game/player";

export function useGameData(player: PlayerSession | null) {
```

In the `useEffect`, return early if `!player`:

```ts
if (!player) {
  setInventory([]);
  setRankings([]);
  setBattle(createBattle(fallbackCards));
  return;
}

getInitialGameData({ player }).then((data) => {
```

Set effect dependencies to `[player]`.

Modify `src/hooks/useGachaFlow.ts` props:

```ts
player: PlayerSession | null;
setPlayer: Dispatch<SetStateAction<PlayerSession | null>>;
```

Call:

```ts
if (!player || isDrawing) {
  return;
}

void recordInventoryDraw({ draw: { nickname: player.nickname, count } }).then((result) => {
  if (result.player) {
    setPlayer(result.player);
  }
```

Modify `src/hooks/useBattleFlow.ts` props:

```ts
player: PlayerSession | null;
setPlayer: Dispatch<SetStateAction<PlayerSession | null>>;
```

Guard `startBattle`:

```ts
if (!player) {
  return;
}
```

Call `recordMatchResult` with `nickname: player.nickname` and update:

```ts
if (result.player) {
  setPlayer(result.player);
}
if (result.rankings.length > 0) {
  setRankings(result.rankings);
}
```

- [ ] **Step 2: Create login screen component**

Create `src/components/game/screens/LoginScreen.tsx`:

```tsx
"use client";

import { FormEvent, useState } from "react";

export function LoginScreen({
  error,
  isLoading,
  onSubmit,
}: {
  error: string | null;
  isLoading: boolean;
  onSubmit: (nickname: string) => void;
}) {
  const [nickname, setNickname] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(nickname);
  }

  return (
    <section className="login-screen" aria-label="닉네임 로그인">
      <form className="login-panel" onSubmit={handleSubmit}>
        <p className="owner-name">CARD GAME</p>
        <h1 className="game-title">LOGIN</h1>
        <label className="login-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="login-input"
          maxLength={16}
          minLength={2}
          name="nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="닉네임 입력"
        />
        {error && <p className="login-error">{error}</p>}
        <button className="neon-button" disabled={isLoading} type="submit">
          {isLoading ? "접속 중" : "입장"}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 3: Wire session state in page**

Modify `src/app/page.tsx`:

```tsx
import { useEffect, useState } from "react";
import { LoginScreen } from "@/components/game/screens/LoginScreen";
import { getPlayerSession } from "@/lib/game/backend";
import type { PlayerSession } from "@/lib/game/player";

const savedNicknameKey = "cg:nickname";
```

Inside component:

```tsx
const [player, setPlayer] = useState<PlayerSession | null>(null);
const [loginError, setLoginError] = useState<string | null>(null);
const [isLoggingIn, setIsLoggingIn] = useState(false);
const { battle, cards, inventory, rankings, setBattle, setInventory, setRankings } = useGameData(player);
```

Add:

```tsx
async function login(nickname: string) {
  setIsLoggingIn(true);
  setLoginError(null);
  const nextPlayer = await getPlayerSession({ nickname });
  setIsLoggingIn(false);

  if (!nextPlayer) {
    window.localStorage.removeItem(savedNicknameKey);
    setLoginError("닉네임을 확인하고 다시 시도하세요.");
    return;
  }

  window.localStorage.setItem(savedNicknameKey, nextPlayer.nickname);
  setPlayer(nextPlayer);
  setScreen("home");
}

function logout() {
  cancelPendingBattle();
  window.localStorage.removeItem(savedNicknameKey);
  setPlayer(null);
  setScreen("home");
}

useEffect(() => {
  const savedNickname = window.localStorage.getItem(savedNicknameKey);
  if (savedNickname) {
    void login(savedNickname);
  }
}, []);
```

Render login before game screens:

```tsx
if (!player) {
  return (
    <main className="game-shell">
      <Sparkles />
      <LoginScreen error={loginError} isLoading={isLoggingIn} onSubmit={login} />
    </main>
  );
}
```

Pass `player` and `setPlayer` into hooks.

- [ ] **Step 4: Update home and ranking props**

Modify `HomeScreen` props:

```ts
player: PlayerSession;
onLogout: () => void;
```

Render nickname/score:

```tsx
<p className="owner-name">{player.nickname} / {player.score}</p>
```

Add logout button inside `home-menu`:

```tsx
<button className="neon-button compact" onClick={onLogout} type="button">
  로그아웃
</button>
```

Modify `RankingScreen` to use `nickname` and `isActivePlayer`:

```tsx
<li className={entry.isActivePlayer ? "my-rank" : ""} key={entry.id}>
  <span>{entry.place}</span>
  <strong>{entry.nickname}</strong>
  <em>{entry.score}</em>
</li>
```

- [ ] **Step 5: Run typecheck build phase**

Run: `pnpm build`

Expected: build succeeds or reports only concrete TypeScript errors from missed prop/signature updates. Fix missed prop/signature errors until build succeeds.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/page.tsx src/hooks/useGameData.ts src/hooks/useGachaFlow.ts src/hooks/useBattleFlow.ts src/components/game/screens/LoginScreen.tsx src/components/game/screens/HomeScreen.tsx src/components/game/screens/RankingScreen.tsx
git commit -m "feat: add nickname login flow"
```

Expected: commit succeeds.

---

### Task 8: Animation Timing And Intensity

**Files:**
- Modify: `src/lib/game/animation.ts`
- Modify: `src/lib/game/animation.test.ts`
- Modify: `src/components/game/screens/BattleScreen.tsx`
- Modify: `src/components/game/screens/GachaScreen.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add failing animation helper tests**

Update `src/lib/game/animation.test.ts` import:

```ts
import { battleAnimationForTick, gachaAnimationLayout, gachaRevealTiming } from "./animation";
```

Add:

```ts
describe("gachaRevealTiming", () => {
  it("uses slower showcase timing for 1 and 10 draws while keeping 100 draws practical", () => {
    assert.deepEqual(gachaRevealTiming(1), { intervalMs: 650, effectSeconds: 1.25 });
    assert.deepEqual(gachaRevealTiming(10), { intervalMs: 260, effectSeconds: 1.05 });
    assert.deepEqual(gachaRevealTiming(100), { intervalMs: 45, effectSeconds: 0.72 });
  });
});
```

- [ ] **Step 2: Run animation tests to verify failure**

Run: `pnpm test src/lib/game/animation.test.ts`

Expected: FAIL because `gachaRevealTiming` does not exist.

- [ ] **Step 3: Implement animation timing helper**

Modify `src/lib/game/animation.ts`:

```ts
export function gachaRevealTiming(count: InventoryDrawInput["count"]) {
  if (count === 1) {
    return { intervalMs: 650, effectSeconds: 1.25 };
  }

  if (count === 10) {
    return { intervalMs: 260, effectSeconds: 1.05 };
  }

  return { intervalMs: 45, effectSeconds: 0.72 };
}
```

- [ ] **Step 4: Use timing in gacha hook and screen**

In `src/hooks/useGachaFlow.ts`, import `gachaRevealTiming` and replace the hardcoded `100` interval:

```ts
const timing = gachaRevealTiming(gachaCount);
```

Use:

```ts
}, timing.intervalMs);
```

Compute timing inside `GachaScreen` from `gachaCount`. In `GachaScreen`, replace hardcoded durations with `const timing = gachaRevealTiming(gachaCount);` and use `timing.effectSeconds` for flash/ring/card timeline durations:

```ts
const revealSeconds = timing.effectSeconds;
```

Use durations around `revealSeconds * 0.45`, `revealSeconds * 0.55`, and `revealSeconds * 0.75` so the full reveal remains close to the helper value.

- [ ] **Step 5: Intensify battle GSAP timeline**

In `BattleScreen`, extend the timeline by changing core durations:

```ts
.to(attacker, { x: direction * 126, y: -38, rotate: direction * 18, scale: 1.2, duration: 0.22, ease: "power4.in" }, 0)
.to(versus, { scale: 1.72, rotate: direction * 12, color: "#fff7ad", duration: 0.18, ease: "power4.out" }, 0.06)
.to(slash, { opacity: 1, scaleX: 1.7, x: direction * 26, duration: 0.2, ease: "power4.out" }, 0.12)
.to(defender, { x: direction * 58, y: 24, rotate: direction * 20, scale: 0.9, filter: "brightness(3.2) saturate(2.8)", duration: 0.2, ease: "power4.out" }, 0.18)
.to(arena, { x: direction * 10, y: -4, duration: 0.08, yoyo: true, repeat: 5, ease: "rough({ strength: 2, points: 12, template: none.out })" }, 0.18)
.to(attacker, { x: 0, y: 0, rotate: 0, scale: 1, duration: 0.58, ease: "elastic.out(1, 0.35)" }, 0.34)
.to(defender, { x: 0, y: 0, rotate: 0, scale: 1, filter: "brightness(1) saturate(1)", duration: 0.62, ease: "elastic.out(1, 0.28)" }, 0.36)
```

Extend laser/explosion/fire opacity decay durations to `0.42`-`0.62` seconds and start them with overlap around `0.14`.

- [ ] **Step 6: Update CSS motion**

In `src/app/globals.css`, change idle keyframes durations:

```css
.spinning-card {
  animation: card-sway 4.6s ease-in-out infinite alternate, card-glow 3.8s ease-in-out infinite;
}

.card-shine {
  animation: card-shine 4.2s infinite;
}

.sparkle {
  animation: sparkle 2.4s infinite;
}
```

Add reduced motion branch:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }

  .spinning-card,
  .sparkle,
  .card-shine {
    animation: none !important;
  }
}
```

- [ ] **Step 7: Run animation tests and build**

Run:

```bash
pnpm test src/lib/game/animation.test.ts
pnpm build
```

Expected: animation tests PASS and build succeeds.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/lib/game/animation.ts src/lib/game/animation.test.ts src/hooks/useGachaFlow.ts src/components/game/screens/BattleScreen.tsx src/components/game/screens/GachaScreen.tsx src/app/globals.css
git commit -m "feat: intensify game animations"
```

Expected: commit succeeds.

---

### Task 9: Full Verification And Browser Pass

**Files:**
- No planned source edits unless verification finds defects.

- [ ] **Step 1: Run full automated verification**

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Start development server**

Run:

```bash
pnpm dev
```

Expected: Next dev server starts, usually at `http://localhost:3000`. Keep the process running for browser verification.

- [ ] **Step 3: Browser verify login**

Open `http://localhost:3000`.

Expected:

- login screen appears before the game menu
- entering `junhu` reaches the home screen
- home screen shows nickname and score
- logout returns to login
- entering `otheruser` reaches a separate session

- [ ] **Step 4: Browser verify inventory**

With nickname `junhu`:

- open gacha
- draw 1 or 10 cards
- open cards screen

Expected: collection quantities increase for drawn cards.

Log out, enter `otheruser`, open cards.

Expected: `otheruser` does not inherit `junhu` quantities.

- [ ] **Step 5: Browser verify ranked match and ranking**

With `junhu`:

- start ranked match
- wait for result and server persistence
- open ranking

Expected: if server result is a player win, score increases by 25 and `junhu` row is highlighted. If server result is loss/draw, score remains unchanged and row is still highlighted.

- [ ] **Step 6: Browser verify animation quality**

Expected:

- battle attacks run longer than the old sub-half-second flash
- battle effects overlap with card recoil and arena shake
- 1-card gacha has a showcase reveal
- 10-card gacha reveals are individually visible
- 100-card gacha completes without feeling frozen

- [ ] **Step 7: Final commit for verification fixes if needed**

If verification required fixes in `src/app/page.tsx` and `src/app/globals.css`, commit only those files:

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "fix: complete nickname game verification"
```

Expected: commit succeeds. If verification required fixes in different files, replace the `git add` command with exact paths reported by `git status --short` before committing. If no fixes were needed, do not create an empty commit.
