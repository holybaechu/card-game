import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { drawRandomCards, mapInventoryRow, type InventoryDrawInput, type InventoryEntry, type InventoryRow } from "./inventory";
import { createServerMatchResult, type MatchRequestInput, type PersistableMatchResult } from "./matches";

type SupabaseClient = NonNullable<ReturnType<typeof createServerSupabaseClient>>;
type CardQueryClient = Pick<SupabaseClient, "from">;
type InventorySupabaseClient = {
  rpc: (
    name: string,
    args: { drawn_card_ids: number[] },
  ) => Promise<{
    data: InventoryRow[] | null;
    error: unknown;
  }>;
};
type InventoryPersistenceClient = InventorySupabaseClient & Partial<CardQueryClient>;

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

export async function persistMatchResult({
  client = createServerSupabaseClient(),
  cards,
  match,
}: {
  client?: SupabaseClient | null;
  cards?: GameCard[];
  match: MatchRequestInput;
}): Promise<{ persisted: boolean; match: PersistableMatchResult | null }> {
  const persistedMatch = createServerMatchResult(match, await loadServerCards(client, cards));

  if (!client) {
    return { persisted: false, match: persistedMatch };
  }

  const insertResponse = await client.from("game_matches").insert({
    mode: persistedMatch.mode,
    player_card_id: persistedMatch.playerCardId,
    enemy_card_id: persistedMatch.enemyCardId,
    result: persistedMatch.result,
    score_delta: persistedMatch.scoreDelta,
  });

  if (insertResponse.error) {
    return { persisted: false, match: null };
  }

  if (persistedMatch.scoreDelta > 0) {
    const current = await client.from("game_rankings").select("score").eq("is_player", true).limit(1).maybeSingle();
    const score = current.data?.score;

    if (!current.error && typeof score === "number") {
      const updateResponse = await client
        .from("game_rankings")
        .update({ score: Math.max(0, score + persistedMatch.scoreDelta), updated_at: new Date().toISOString() })
        .eq("is_player", true);

      if (updateResponse.error) {
        return { persisted: false, match: null };
      }
    }
  }

  return { persisted: true, match: persistedMatch };
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
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[] }> {
  const cardClient = client && typeof client.from === "function" ? { from: client.from.bind(client) } : null;
  const drawnCards = drawRandomCards(await loadServerCards(cardClient, cards), draw.count, random);

  if (!client) {
    return { persisted: false, drawnCards, inventory: [] };
  }

  const response = await client.rpc("increment_game_inventory", { drawn_card_ids: drawnCards.map((card) => card.id) });
  if (response.error || !response.data) {
    return { persisted: false, drawnCards: [], inventory: [] };
  }

  return {
    persisted: true,
    drawnCards,
    inventory: response.data.map(mapInventoryRow),
  };
}
