# Nickname Supabase Game Design

## Goal

Make inventory, ranking, ranked matches, and temporary nickname login work as real Supabase-backed game features. A nickname is the account identifier for this iteration: entering an existing nickname logs into the same game state, and entering a new nickname creates a new player.

The implementation keeps browser clients from directly mutating scores, matches, or inventory. Client code sends only nickname and gameplay inputs to Next.js API routes. Server code owns player creation, inventory persistence, match scoring, and score updates.

## Data Model

Add `public.game_players`:

- `id bigint primary key generated always as identity`
- `nickname text not null unique`
- `score integer not null default 1000 check (score >= 0)`
- timestamps for creation and update

Use `game_players.score` as the source of truth for rankings. Ranking screens read players ordered by score descending. Existing seeded non-player ranking rows are migrated into seeded `game_players` rows, and the legacy `game_rankings` table stops being used by app code.

Change `public.game_inventory` from shared card counts to player-owned card counts:

- add `player_id bigint not null references public.game_players(id) on delete cascade`
- replace `unique (card_id)` with `unique (player_id, card_id)`
- keep `card_id`, `quantity`, timestamps, and non-negative quantity checks

Change `public.game_matches` to include:

- `player_id bigint references public.game_players(id) on delete cascade`

Ranked and normal matches both persist a match row. Only ranked player wins produce a score delta. Browser users retain public read access where needed, but all writes remain server-only through service role or server secret usage in API routes.

## API Flow

Add `POST /api/player/session` as the player session API route.

Request:

```json
{ "nickname": "junhu" }
```

Server behavior:

1. Trim and validate nickname.
2. Upsert or fetch `game_players` by nickname.
3. Return the player id, nickname, and score.

Update initial game data loading so it depends on an active player:

- card catalog: public `game_cards`
- rankings: public/player-backed ranking list
- inventory: only the active player's `game_inventory`

Update gacha API to accept `{ nickname, count }`. The server resolves the player, draws cards, increments only that player's inventory, and returns the drawn cards plus that player's current inventory.

Update match API to accept `{ nickname, mode, playerCardId, enemyCardId }`. The server resolves the player, recomputes match outcome from server-known card stats, inserts the match, updates that player's score if applicable, and returns the persisted match plus current score/ranking data needed by the UI.

## Client Flow

On first load, show a nickname login panel before the game home. The nickname field is the only credential. Submitting it calls the session API. On success, store the nickname in React state and `localStorage`.

On later visits, if a saved nickname exists, attempt the same session API call automatically. If it fails, clear the saved nickname and show the login panel again.

The home screen shows the active nickname and current score, with a logout control that only clears the local saved nickname and returns to the nickname panel. The server-side player row remains.

`useGameData` should load data only after a player session exists. `useGachaFlow` and `useBattleFlow` should include the active nickname in server calls. Ranking rows should highlight the active nickname rather than a legacy `isPlayer` flag.

## Gameplay Behavior

Inventory:

- Gacha draw results are accumulated per nickname.
- Card collection shows only the active player's owned quantities.
- Different nicknames must not share inventory counts.

Ranking:

- Ranking screen orders `game_players` by score.
- The active player's row is highlighted by nickname or player id.

Ranked matches:

- The client still runs an auto battle for presentation.
- The server remains authoritative for match result and score delta.
- Ranked player wins add `+25`.
- Ranked losses, draws, and all normal matches add `0`.
- After a ranked match persists, the UI updates the current score and ranking rows from server-returned data or a fresh reload.

## Animation Behavior

Keep the visual direction intentionally intense. Current combat effects are too short, so extend battle effect timelines from sub-half-second hits to roughly 0.9-1.2 second overlapping sequences while keeping the battle tick at one second unless implementation testing shows visible clipping.

Battle effects should add stronger:

- attacker lunge and elastic return
- defender knockback and brightness/saturation flash
- screen or arena shake
- slash, laser, explosion, and fire overlap
- longer glow decay

Gacha reveal timing should change:

- 1-card draw: slower showcase reveal with larger flash/ring buildup
- 10-card draw: visible individual card reveals with stronger pop and spin
- 100-card draw: still fast enough to complete, but with a longer global flash/ring effect and less abrupt ending

CSS idle animations should use slower, more intense glow/sway cycles. Add a `prefers-reduced-motion: reduce` branch to reduce heavy shake, long repeated motion, and excessive transforms for users who request reduced motion.

## Testing

Add or update focused tests for:

- nickname parsing and validation
- player session creation/reuse
- player-specific inventory increment behavior
- ranked match score updates scoped to the active player
- ranking sorting and active-player highlighting inputs
- gacha animation layout/reveal timing helper behavior

Keep tests aligned with the existing `node --test --import tsx` setup.

## Verification

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

After implementation, start the dev server and verify in browser:

1. Enter a new nickname and reach the home screen.
2. Draw cards and confirm collection quantities increase.
3. Log out, enter a different nickname, and confirm inventory is separate.
4. Run a ranked match and confirm score/ranking updates.
5. Confirm animations are visibly longer and more intense.
6. Confirm reduced motion mode does not keep the harsh shake path.

## Scope Boundaries

This iteration does not add passwords, Supabase Auth, email login, rate limiting, or anti-cheat beyond server-owned writes and server-recomputed match results. Nickname ownership is intentionally weak because the requested login model is temporary.
