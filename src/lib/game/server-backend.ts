import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { drawRandomCards, mapInventoryRow, type InventoryDrawInput, type InventoryEntry, type InventoryRow } from "./inventory";
import { createServerMatchResult, type MatchRequestInput, type PersistableMatchResult } from "./matches";
import { mapPlayerRow, parseNickname, sortRankingRows, type PlayerRow, type PlayerSession, type RankingEntry } from "./player";

type QueryResponse<T> = PromiseLike<{ data: T | null; error: unknown }>;
type ListQueryResponse<T> = PromiseLike<{ data: T[] | null; error: unknown }>;
type SelectSingleBuilder<T> = { maybeSingle(): QueryResponse<T> };
type SelectListBuilder<T> = { order(column: string, options?: { ascending?: boolean }): ListQueryResponse<T> };
type SelectableSingleBuilder<T> = { select(columns: string): SelectSingleBuilder<T> };
type CardTable = { select(columns: string): SelectListBuilder<CardRow> };
type MatchTable = { insert(payload: Record<string, unknown>): PromiseLike<{ error: unknown }> };
type PlayerTable = {
  upsert(payload: { nickname: string }, options: { onConflict: "nickname" }): SelectableSingleBuilder<PlayerRow>;
  select(columns: string): SelectListBuilder<PlayerRow>;
};
type TableClient = { from(table: string): unknown };
type RpcClient = { rpc(name: string, args: Record<string, unknown>): QueryResponse<unknown> };
type SupabaseClient = TableClient & RpcClient;
type PlayerPersistenceClient = TableClient;

function cardTable(client: TableClient) {
  return client.from("game_cards") as CardTable;
}

function matchTable(client: TableClient) {
  return client.from("game_matches") as MatchTable;
}

function playerTable(client: TableClient) {
  return client.from("game_players") as PlayerTable;
}

async function loadServerCards(client: TableClient | null, cards?: GameCard[]) {
  if (cards) {
    return cards;
  }

  if (!client) {
    return fallbackCards;
  }

  const response = await cardTable(client).select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order");
  if (response.error || !response.data?.length) {
    return fallbackCards;
  }

  return (response.data as CardRow[]).map(mapCardRow);
}

export async function upsertPlayerSession({
  client,
  nickname,
}: {
  client: PlayerPersistenceClient | null;
  nickname: string;
}): Promise<PlayerSession | null> {
  const normalizedNickname = parseNickname(nickname);

  if (!client) {
    return { id: 1, nickname: normalizedNickname, score: 1000 };
  }

  const response = await playerTable(client)
    .upsert({ nickname: normalizedNickname }, { onConflict: "nickname" })
    .select("id,nickname,score")
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  return mapPlayerRow(response.data as PlayerRow);
}

async function loadPlayerRankings(client: PlayerPersistenceClient | null, activePlayer: PlayerSession | null): Promise<RankingEntry[]> {
  if (!activePlayer) {
    return [];
  }

  if (!client) {
    return sortRankingRows([activePlayer], activePlayer.id);
  }

  const response = await playerTable(client).select("id,nickname,score").order("score", { ascending: false });
  if (response.error || !response.data?.length) {
    return sortRankingRows([activePlayer], activePlayer.id);
  }

  return sortRankingRows(response.data as PlayerRow[], activePlayer.id);
}

export async function persistMatchResult({
  client = createServerSupabaseClient() as SupabaseClient | null,
  cards,
  match,
}: {
  client?: SupabaseClient | null;
  cards?: GameCard[];
  match: MatchRequestInput;
}): Promise<{ persisted: boolean; match: PersistableMatchResult | null; player: PlayerSession | null; rankings: RankingEntry[] }> {
  const player = await upsertPlayerSession({ client, nickname: match.nickname });
  const normalizedMatch = { ...match, nickname: player?.nickname ?? parseNickname(match.nickname) };
  const persistedMatch = createServerMatchResult(normalizedMatch, await loadServerCards(client, cards));

  if (!client || !player) {
    return { persisted: false, match: persistedMatch, player, rankings: await loadPlayerRankings(null, player) };
  }

  const insertResponse = await matchTable(client).insert({
    player_id: player.id,
    mode: persistedMatch.mode,
    player_card_id: persistedMatch.playerCardId,
    enemy_card_id: persistedMatch.enemyCardId,
    result: persistedMatch.result,
    score_delta: persistedMatch.scoreDelta,
  });

  if (insertResponse.error) {
    return { persisted: false, match: null, player, rankings: await loadPlayerRankings(client, player) };
  }

  let currentPlayer = player;
  if (persistedMatch.scoreDelta > 0) {
    const updateResponse = await client.rpc("increment_game_player_score", {
      target_player_id: player.id,
      score_delta: persistedMatch.scoreDelta,
    });
    const updatedPlayerRow = Array.isArray(updateResponse.data) ? updateResponse.data[0] : updateResponse.data;

    if (updateResponse.error || !updatedPlayerRow) {
      return { persisted: false, match: null, player, rankings: await loadPlayerRankings(client, player) };
    }

    currentPlayer = mapPlayerRow(updatedPlayerRow as PlayerRow);
  }

  return { persisted: true, match: persistedMatch, player: currentPlayer, rankings: await loadPlayerRankings(client, currentPlayer) };
}

export async function persistInventoryDraw({
  client = createServerSupabaseClient() as SupabaseClient | null,
  cards,
  draw,
  random,
}: {
  client?: SupabaseClient | null;
  cards?: GameCard[];
  draw: InventoryDrawInput;
  random?: () => number;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[]; player: PlayerSession | null }> {
  const player = await upsertPlayerSession({ client, nickname: draw.nickname });
  const drawnCards = drawRandomCards(await loadServerCards(client, cards), draw.count, random);

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
    inventory: (response.data as InventoryRow[]).map(mapInventoryRow),
    player,
  };
}
