import { createGameSupabaseClient, getPublicSupabaseEnv, hasPublicSupabaseEnv, type PublicSupabaseEnv } from "@/lib/supabase/client";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { mapInventoryRow, type InventoryDrawInput, type InventoryEntry, type InventoryRow } from "./inventory";
import type { MatchRequestInput, PersistableMatchResult } from "./matches";

export type RankingEntry = {
  name: string;
  score: number;
  isPlayer: boolean;
};

type RankingRow = {
  player_name: string;
  score: number;
  is_player: boolean;
};

export type InitialGameData = {
  cards: GameCard[];
  rankings: RankingEntry[];
  inventory: InventoryEntry[];
};

export const fallbackRankings: RankingEntry[] = [
  { name: "배준후", score: 1000, isPlayer: true },
  { name: "NeonMaster", score: 1360, isPlayer: false },
  { name: "SparkQueen", score: 1280, isPlayer: false },
  { name: "FlashKing", score: 1195, isPlayer: false },
  { name: "CardWizard", score: 1070, isPlayer: false },
];

function sortRankings(rankings: RankingEntry[]) {
  return [...rankings].sort((a, b) => b.score - a.score);
}

function mapRankingRow(row: RankingRow): RankingEntry {
  return {
    name: row.player_name,
    score: row.score,
    isPlayer: row.is_player,
  };
}

export async function getInitialGameData({ env = getPublicSupabaseEnv() }: { env?: PublicSupabaseEnv } = {}): Promise<InitialGameData> {
  if (!hasPublicSupabaseEnv(env)) {
    return { cards: fallbackCards, rankings: fallbackRankings, inventory: [] };
  }

  const supabase = createGameSupabaseClient(env);
  if (!supabase) {
    return { cards: fallbackCards, rankings: fallbackRankings, inventory: [] };
  }

  const [cardsResponse, rankingsResponse, inventoryResponse] = await Promise.all([
    supabase.from("game_cards").select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order"),
    supabase.from("game_rankings").select("player_name,score,is_player").order("score", { ascending: false }),
    supabase.from("game_inventory").select("card_id,quantity").order("card_id"),
  ]);

  const cards = cardsResponse.error || !cardsResponse.data?.length ? fallbackCards : (cardsResponse.data as CardRow[]).map(mapCardRow);
  const rankings =
    rankingsResponse.error || !rankingsResponse.data?.length ? fallbackRankings : sortRankings((rankingsResponse.data as RankingRow[]).map(mapRankingRow));
  const inventory = inventoryResponse.error || !inventoryResponse.data ? [] : (inventoryResponse.data as InventoryRow[]).map(mapInventoryRow);

  return { cards, rankings, inventory };
}

export async function recordInventoryDraw({
  count,
  fetcher = fetch,
}: {
  count: InventoryDrawInput["count"];
  fetcher?: typeof fetch;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[] }> {
  try {
    const response = await fetcher("/api/inventory/draws", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      return { persisted: false, drawnCards: [], inventory: [] };
    }

    const data = (await response.json()) as { persisted?: unknown; drawnCards?: unknown; inventory?: unknown };
    return {
      persisted: data.persisted === true,
      drawnCards: Array.isArray(data.drawnCards) ? (data.drawnCards as GameCard[]) : [],
      inventory: Array.isArray(data.inventory) ? (data.inventory as InventoryEntry[]) : [],
    };
  } catch {
    return { persisted: false, drawnCards: [], inventory: [] };
  }
}

export async function recordMatchResult({
  fetcher = fetch,
  match,
}: {
  match: MatchRequestInput;
  fetcher?: typeof fetch;
}): Promise<{ persisted: boolean; match: PersistableMatchResult | null }> {
  try {
    const response = await fetcher("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(match),
    });

    if (!response.ok) {
      return { persisted: false, match: null };
    }

    const data = (await response.json()) as PersistableMatchResult & { persisted?: unknown };
    if (data.persisted !== true) {
      return { persisted: false, match: null };
    }

    return {
      persisted: true,
      match: {
        mode: data.mode,
        playerCardId: data.playerCardId,
        enemyCardId: data.enemyCardId,
        result: data.result,
        scoreDelta: data.scoreDelta,
      },
    };
  } catch {
    return { persisted: false, match: null };
  }
}
