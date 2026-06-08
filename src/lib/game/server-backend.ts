import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { drawRandomCards, mapInventoryRow, type InventoryDrawInput, type InventoryEntry, type InventoryRow } from "./inventory";
import { createServerMatchResult, type MatchRequestInput, type PersistableMatchResult } from "./matches";
import { mapPlayerRow, parseNickname, sortRankingRows, type PlayerRow, type PlayerSession, type RankingEntry } from "./player";

type SupabaseClient = NonNullable<ReturnType<typeof createServerSupabaseClient>>;
type CardQueryClient = Pick<SupabaseClient, "from">;
type InventorySupabaseClient = {
  rpc: (
    name: string,
    args: { target_player_id: number; drawn_card_ids: number[] },
  ) => Promise<{
    data: InventoryRow[] | null;
    error: unknown;
  }>;
};
type InventoryPersistenceClient = InventorySupabaseClient & Partial<CardQueryClient>;
type PlayerPersistenceClient = Pick<SupabaseClient, "from">;

async function loadServerCards(client: CardQueryClient | null, cards?: GameCard[]) {
  if (cards) {
    return cards;
  }

  if (!client) {
    return fallbackCards;
  }

  const response = await client.from("game_cards").select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order");
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

  const response = await client
    .from("game_players")
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

  const response = await client.from("game_players").select("id,nickname,score").order("score", { ascending: false });
  if (response.error || !response.data?.length) {
    return sortRankingRows([activePlayer], activePlayer.id);
  }

  return sortRankingRows(response.data as PlayerRow[], activePlayer.id);
}

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
  const normalizedMatch = { ...match, nickname: player?.nickname ?? parseNickname(match.nickname) };
  const persistedMatch = createServerMatchResult(normalizedMatch, await loadServerCards(client, cards));

  if (!client || !player) {
    return { persisted: false, match: persistedMatch, player, rankings: await loadPlayerRankings(null, player) };
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
    return { persisted: false, match: null, player, rankings: await loadPlayerRankings(client, player) };
  }

  let currentPlayer = player;
  if (persistedMatch.scoreDelta > 0) {
    const updateResponse = await client
      .from("game_players")
      .update({ score: Math.max(0, player.score + persistedMatch.scoreDelta) })
      .eq("id", player.id)
      .select("id,nickname,score")
      .maybeSingle();

    if (updateResponse.error || !updateResponse.data) {
      return { persisted: false, match: null, player, rankings: await loadPlayerRankings(client, player) };
    }

    currentPlayer = mapPlayerRow(updateResponse.data as PlayerRow);
  }

  return { persisted: true, match: persistedMatch, player: currentPlayer, rankings: await loadPlayerRankings(client, currentPlayer) };
}

export async function persistInventoryDraw({
  client = createServerSupabaseClient() as InventoryPersistenceClient | null,
  cards,
  draw,
  random,
}: {
  client?: InventoryPersistenceClient | null;
  cards?: GameCard[];
  draw: InventoryDrawInput;
  random?: () => number;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[]; player: PlayerSession | null }> {
  const cardClient = client && typeof client.from === "function" ? { from: client.from.bind(client) } : null;
  const playerClient = client && typeof client.from === "function" ? { from: client.from.bind(client) } : null;
  const player = await upsertPlayerSession({ client: playerClient, nickname: draw.nickname });
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
