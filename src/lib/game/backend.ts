import { createGameSupabaseClient, getPublicSupabaseEnv, hasPublicSupabaseEnv, type PublicSupabaseEnv } from "@/lib/supabase/client";
import { fallbackCards, mapCardRow, type CardRow, type GameCard } from "./cards";
import { mapInventoryRow, type InventoryDrawInput, type InventoryEntry, type InventoryRow } from "./inventory";
import type { MatchRequestInput, PersistableMatchResult } from "./matches";

type PlayerRow = {
  id: number;
  nickname: string;
  score: number;
};

export type PlayerSession = PlayerRow;

export type RankingEntry = {
  name: string;
  score: number;
  isPlayer: boolean;
};

const fallbackRankingRows: PlayerRow[] = [
  { id: 1, nickname: "NeonMaster", score: 1360 },
  { id: 2, nickname: "SparkQueen", score: 1280 },
  { id: 3, nickname: "FlashKing", score: 1195 },
  { id: 4, nickname: "CardWizard", score: 1070 },
];

export type InitialGameData = {
  cards: GameCard[];
  rankings: RankingEntry[];
  inventory: InventoryEntry[];
};

export function mapPlayerRow(row: PlayerRow): PlayerSession {
  return {
    id: row.id,
    nickname: row.nickname,
    score: row.score,
  };
}

export function sortRankingRows(rows: PlayerRow[], player: PlayerSession): RankingEntry[] {
  return [...rows]
    .map((row) => ({
      name: row.nickname,
      score: row.score,
      isPlayer: row.id === player.id,
    }))
    .sort((a, b) => b.score - a.score);
}

export function getFallbackRankings(player: PlayerSession): RankingEntry[] {
  const rows = [{ id: player.id, nickname: player.nickname, score: player.score }, ...fallbackRankingRows];
  return sortRankingRows(rows, player);
}

export async function getPlayerSession({
  nickname,
  fetcher = fetch,
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

    const data = (await response.json()) as PlayerRow;
    return mapPlayerRow(data);
  } catch {
    return null;
  }
}

export async function getInitialGameData({
  env = getPublicSupabaseEnv(),
  player,
}: {
  env?: PublicSupabaseEnv;
  player: PlayerSession;
}): Promise<InitialGameData> {
  if (!hasPublicSupabaseEnv(env)) {
    return {
      cards: fallbackCards,
      rankings: getFallbackRankings(player),
      inventory: [],
    };
  }

  const supabase = createGameSupabaseClient(env);
  if (!supabase) {
    return {
      cards: fallbackCards,
      rankings: getFallbackRankings(player),
      inventory: [],
    };
  }

  const [cardsResponse, rankingsResponse, inventoryResponse] = await Promise.all([
    supabase.from("game_cards").select("id,name,rarity,attack,hp,image_path,sort_order").order("sort_order"),
    supabase.from("game_players").select("id,nickname,score").order("score", { ascending: false }),
    supabase.from("game_inventory").select("card_id,quantity").eq("player_id", player.id).order("card_id"),
  ]);

  const cards = cardsResponse.error || !cardsResponse.data?.length ? fallbackCards : (cardsResponse.data as CardRow[]).map(mapCardRow);
  const rankings =
    rankingsResponse.error || !rankingsResponse.data?.length
      ? getFallbackRankings(player)
      : sortRankingRows(rankingsResponse.data as PlayerRow[], player);
  const inventory = inventoryResponse.error || !inventoryResponse.data ? [] : (inventoryResponse.data as InventoryRow[]).map(mapInventoryRow);

  return { cards, rankings, inventory };
}

export async function recordInventoryDraw({
  draw,
  fetcher = fetch,
}: {
  draw: InventoryDrawInput & { nickname: string };
  fetcher?: typeof fetch;
}): Promise<{ persisted: boolean; drawnCards: GameCard[]; inventory: InventoryEntry[]; player: PlayerSession | null }> {
  try {
    const response = await fetcher("/api/inventory/draws", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draw),
    });

    if (!response.ok) {
      return { persisted: false, drawnCards: [], inventory: [], player: null };
    }

    const data = (await response.json()) as {
      persisted?: unknown;
      drawnCards?: unknown;
      inventory?: unknown;
      player?: PlayerRow;
    };

    return {
      persisted: data.persisted === true,
      drawnCards: Array.isArray(data.drawnCards) ? (data.drawnCards as GameCard[]) : [],
      inventory: Array.isArray(data.inventory) ? (data.inventory as InventoryEntry[]) : [],
      player: data.player ? mapPlayerRow(data.player) : null,
    };
  } catch {
    return { persisted: false, drawnCards: [], inventory: [], player: null };
  }
}

export async function recordMatchResult({
  player,
  fetcher = fetch,
  match,
}: {
  player: PlayerSession;
  match: MatchRequestInput & { nickname: string };
  fetcher?: typeof fetch;
}): Promise<{
  persisted: boolean;
  match: PersistableMatchResult | null;
  player: PlayerSession | null;
  rankings: RankingEntry[];
}> {
  try {
    const response = await fetcher("/api/matches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...match, nickname: player.nickname }),
    });

    if (!response.ok) {
      return { persisted: false, match: null, player: null, rankings: [] };
    }

    const data = (await response.json()) as {
      persisted?: unknown;
      mode?: unknown;
      playerCardId?: unknown;
      enemyCardId?: unknown;
      result?: unknown;
      scoreDelta?: unknown;
      player?: PlayerRow;
      rankings?: PlayerRow[];
    };

    if (data.persisted !== true) {
      return { persisted: false, match: null, player: null, rankings: [] };
    }

    return {
      persisted: true,
      match: {
        mode: data.mode as PersistableMatchResult["mode"],
        playerCardId: data.playerCardId as PersistableMatchResult["playerCardId"],
        enemyCardId: data.enemyCardId as PersistableMatchResult["enemyCardId"],
        result: data.result as PersistableMatchResult["result"],
        scoreDelta: data.scoreDelta as PersistableMatchResult["scoreDelta"],
      },
      player: data.player ? mapPlayerRow(data.player) : null,
      rankings: (() => {
        const rankingPlayer = data.player ? mapPlayerRow(data.player) : player;
        return Array.isArray(data.rankings) ? sortRankingRows(data.rankings, rankingPlayer) : getFallbackRankings(rankingPlayer);
      })(),
    };
  } catch {
    return { persisted: false, match: null, player: null, rankings: [] };
  }
}
